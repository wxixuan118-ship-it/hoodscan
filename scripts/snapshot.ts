/** Bounded hourly publication. No request-triggered upstream work. */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { Pool } from 'pg';
import { getTokenHolders, getTokenTransfers, getContractInfo, getContractSourceInfo, getAddressTransactions, getAddressTokenBalances } from '../lib/blockscout';
import { analyzeTokenRisk } from '../lib/token-risk';
import { pricedToken, isAddress, type TokenSnapshot, type AddressSnapshot } from '../lib/seo-types';
import { poolConfig, type DbToken } from '../lib/db-client';
import { SNAPSHOT_UPSERT } from '../lib/snapshot-store';

const db = new Pool({ ...poolConfig(process.env.DATABASE_URL, 10000), max: 2, connectionTimeoutMillis: 5000 });
const TOKEN_LIMIT = 300;
const ADDRESS_LIMIT = 500;
const TOKEN_BATCH = 20;
const ADDRESS_BATCH = 40;
let failures = 0;
const deadline = Date.now() + 10 * 60_000;
const pause = () => new Promise(resolve => setTimeout(resolve, 500));

async function save(kind: string, address: string, payload: unknown, indexable: boolean) {
  await db.query(SNAPSHOT_UPSERT, [kind, address.toLowerCase(), JSON.stringify(payload), indexable]);
}
async function rpc(method: string, params: string[]) {
  const res = await fetch(process.env.ROBINHOOD_RPC_URL || 'https://rpc.mainnet.chain.robinhood.com', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const data = await res.json() as { result?: string; error?: unknown };
  if (!data.result || data.error || !/^0x[0-9a-f]+$/i.test(data.result)) throw new Error('Invalid RPC response');
  return data.result;
}
function ether(raw: string) {
  const n = BigInt(raw), base = BigInt('1000000000000000000');
  return `${n / base}.${(n % base).toString().padStart(18, '0')}`;
}
async function main() {
  if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
  const lock = await db.connect();
  try {
    const { rows: [result] } = await lock.query('SELECT pg_try_advisory_lock(4663001) AS locked');
    if (!result.locked) { console.log('Snapshot publisher already running'); return; }
    const { rows: candidates } = await db.query<DbToken>(`SELECT * FROM tokens WHERE holders_count >= 10
      AND NOT COALESCE(is_scam,false) AND name <> '' AND symbol <> ''
      AND (liquidity > 0 OR volume_24h > 0 OR contract_verified OR reputation = 'verified')
      ORDER BY holders_count DESC, address LIMIT $1`, [TOKEN_LIMIT]);
    const eligible = candidates.map(t => t.address.toLowerCase());
    // Immediately remove ineligible snapshots from indexing, keeping their last known content.
    await db.query(`UPDATE seo_snapshots SET indexable=false, content_updated_at=now()
      WHERE kind='token' AND indexable AND NOT (address = ANY($1::text[]))`, [eligible]);
    const { rows: ages } = await db.query<{ address: string; fetched_at: string }>("SELECT address, fetched_at FROM seo_snapshots WHERE kind='token'");
    const age = new Map(ages.map(x => [x.address, new Date(x.fetched_at).getTime()]));
    candidates.sort((a,b) => (age.get(a.address) ?? 0) - (age.get(b.address) ?? 0));
    for (const row of candidates.slice(0,TOKEN_BATCH)) {
      if (Date.now() > deadline) break;
      try {
        const token = pricedToken(row);
        // Strict mode prevents upstream failures being published as empty holders / unverified contracts.
        const holders = (await getTokenHolders(row.address, token, true)).slice(0,20);
        const transfers = (await getTokenTransfers(row.address, token, true)).slice(0,20);
        const contract = await getContractInfo(row.address, true);
        const source = contract.verified ? await getContractSourceInfo(row.address, true) : null;
        const risk = holders.length ? await analyzeTokenRisk({ token, holders, contract, source }) : null;
        await save('token', row.address, { token, holders, transfers, contract, risk } satisfies TokenSnapshot, !contract.isScam);
      } catch (error) {
        failures++;
        console.error(`Token ${row.address}: ${error instanceof Error ? error.message : 'snapshot failed'}`);
      }
      await pause();
    }
    // Only successful, indexable token snapshots seed the address collection.
    const { rows: tokens } = await db.query<{ payload: TokenSnapshot }>("SELECT payload FROM seo_snapshots WHERE kind='token' AND indexable ORDER BY address LIMIT 300");
    const addresses = [...new Set(tokens.flatMap(({ payload }) => [payload.contract.creator, ...payload.holders.map(h => h.address)]))]
      .filter((a): a is string => !!a && isAddress(a))
      .map(a => a.toLowerCase()).filter(a => !/^0x0{40}$/.test(a) && a !== '0x000000000000000000000000000000000000dead');
    const selected = [...new Set(addresses)].sort().slice(0,ADDRESS_LIMIT);
    await db.query(`UPDATE seo_snapshots SET indexable=false, content_updated_at=now()
      WHERE kind='address' AND indexable AND NOT (address = ANY($1::text[]))`, [selected]);
    const { rows: addressAges } = await db.query<{ address: string; fetched_at: string }>("SELECT address, fetched_at FROM seo_snapshots WHERE kind='address'");
    const aAge = new Map(addressAges.map(x => [x.address, new Date(x.fetched_at).getTime()]));
    selected.sort((a,b) => (aAge.get(a) ?? 0) - (aAge.get(b) ?? 0));
    for (const address of selected.slice(0,ADDRESS_BATCH)) {
      if (Date.now() > deadline) break;
      try {
        const ethBalance = ether(await rpc('eth_getBalance', [address, 'latest']));
        const displayTxs = (await getAddressTransactions(address, true)).slice(0,20);
        const tokenBalances = (await getAddressTokenBalances(address, true)).slice(0,10);
        // Require useful activity and an association with a qualifying token, not just dust balances.
        const indexable = displayTxs.length >= 5 && tokenBalances.some(b => eligible.includes(b.token.address.toLowerCase()));
        await save('address', address, { ethBalance, displayTxs, tokenBalances } satisfies AddressSnapshot, indexable);
      } catch (error) {
        failures++;
        console.error(`Address ${address}: ${error instanceof Error ? error.message : 'snapshot failed'}`);
      }
      await pause();
    }
    const gasPrice = (Number(BigInt(await rpc('eth_gasPrice', []))) / 1e9).toFixed(4);
    await save('network', 'chain', { gasPrice }, false);
    // Bound retained history as membership changes. Unchanged members retain their last good snapshot.
    await db.query("DELETE FROM seo_snapshots WHERE NOT indexable AND kind <> 'network' AND fetched_at < now() - interval '30 days'");
    if (failures) process.exitCode = 1;
    console.log(`Published at most ${TOKEN_BATCH} tokens and ${ADDRESS_BATCH} addresses; candidates ${eligible.length}/${selected.length}`);
  } finally {
    await lock.query('SELECT pg_advisory_unlock(4663001)');
    lock.release();
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Snapshot failed'); process.exitCode = 1; }).finally(() => db.end());
