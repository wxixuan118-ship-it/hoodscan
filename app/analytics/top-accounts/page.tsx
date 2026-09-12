import type { Metadata } from 'next';
import Link from 'next/link';
import AnalyticsNav from '@/components/AnalyticsNav';
import { formatEther, getMostActiveAccounts, type ActiveAccount } from '@/lib/robinhood-rpc';
import { getChainCounters } from '@/lib/chain-stats';

export const revalidate = 120;

export const metadata: Metadata = {
  title: 'Robinhood Chain Top Accounts | Largest Wallets & Holders',
  description: 'Explore the largest wallet addresses on Robinhood Chain ranked by balance, holdings and blockchain activity.',
  alternates: { canonical: 'https://www.hood-chain.com/analytics/top-accounts' },
};

type BsAddress = {
  hash: string;
  name: string | null;
  is_contract: boolean;
  coin_balance: string | null;
  transactions_count: string | null;
  token_count: number;
};

async function getTopAccounts(): Promise<BsAddress[]> {
  try {
    const res = await fetch(
      'https://robinhoodchain.blockscout.com/api/v2/addresses',
      { headers: { accept: 'application/json' }, next: { revalidate: 120 }, signal: AbortSignal.timeout(15_000) }
    );
    if (!res.ok) return [];
    const data = await res.json() as { items: BsAddress[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

const COL = '48px minmax(160px,2fr) minmax(110px,1.5fr) minmax(130px,1.5fr) minmax(100px,1fr) minmax(100px,1fr)';
const HEADS = ['Rank', 'Address', 'Name / Type', 'Balance', 'Transactions', 'Token Holdings'];

const ACTIVE_COL = '48px minmax(160px,2fr) minmax(110px,1.5fr) minmax(130px,1.5fr) minmax(100px,1fr) minmax(100px,1fr)';
const ACTIVE_HEADS = ['Rank', 'Address', 'Type', 'Balance', 'Sent', 'Received'];

function ActiveAccountsTable({ accounts }: { accounts: ActiveAccount[] }) {
  const doubled = [...accounts, ...accounts];
  const dur = `${Math.max(15, accounts.length * 0.85).toFixed(0)}s`;
  return (
    <div className="dsf-wrap">
      <div className="dsf-head" style={{ gridTemplateColumns: ACTIVE_COL }}>
        {ACTIVE_HEADS.map(h => <div key={h} className="dsf-head-cell">{h}</div>)}
      </div>
      <div className="dsf-window" style={{ height: 480 }}>
        <div className="dsf-track" style={{ '--dur': dur } as React.CSSProperties}>
          {doubled.map((account, i) => (
            <div key={`${account.address}-${i}`} className="dsf-row" style={{ gridTemplateColumns: ACTIVE_COL }}>
              <div className="dsf-cell rank-cell">{(i % accounts.length) + 1}</div>
              <div className="dsf-cell" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                <Link href={`/address/${account.address}`}>{account.address.slice(0, 10)}…{account.address.slice(-8)}</Link>
              </div>
              <div className="dsf-cell">
                <span style={{
                  fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: 4, fontWeight: 600,
                  background: account.isContract ? 'rgba(99,91,255,0.1)' : 'rgba(34,197,94,0.1)',
                  color: account.isContract ? 'var(--primary)' : 'var(--success)',
                }}>
                  {account.isContract ? 'Contract' : 'Wallet'}
                </span>
              </div>
              <div className="dsf-cell" style={{ fontWeight: 600 }}>{account.balance} ETH</div>
              <div className="dsf-cell muted-cell">{account.sent}</div>
              <div className="dsf-cell muted-cell">{account.received}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function TopAccountsPage() {
  // Chain-wide balance ranking needs the indexer; when it is unreachable, fall back to a
  // live activity leaderboard computed from the latest transactions on the node.
  const [accounts, counters] = await Promise.all([getTopAccounts(), getChainCounters()]);
  const active = accounts.length ? [] : await getMostActiveAccounts().catch(() => []);
  const doubled = [...accounts, ...accounts];
  const dur = `${Math.max(15, accounts.length * 0.85).toFixed(0)}s`;
  const fmt = (v: number | null | undefined) => v == null ? '—' : v.toLocaleString();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Top Accounts on Robinhood Chain',
    url: 'https://www.hood-chain.com/analytics/top-accounts',
    numberOfItems: accounts.length,
    itemListElement: accounts.slice(0, 10).map((a, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: a.name ?? a.hash,
      url: `https://www.hood-chain.com/address/${a.hash}`,
    })),
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <AnalyticsNav
        current="/analytics/top-accounts"
        breadcrumbs={[{ label: 'Analytics', href: '/analytics' }, { label: 'Top Accounts' }]}
      />

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.5px' }}>
          Top Accounts on Robinhood Chain
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.925rem', margin: '0 0 0.25rem', lineHeight: 1.6 }}>
          Track the most active and largest accounts on Robinhood Chain.
        </p>
        <p style={{ color: 'var(--muted)', fontSize: '0.925rem', margin: 0, lineHeight: 1.6 }}>
          View wallet balances, transaction activity and on-chain holdings for top addresses.
        </p>
      </div>

      {counters && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Accounts (sent ≥1 tx)', value: fmt(counters.totalAccounts) },
            { label: 'Total addresses', value: fmt(counters.totalAddresses) },
            { label: 'Contracts', value: fmt(counters.totalContracts) },
            { label: 'Verified contracts', value: fmt(counters.totalVerifiedContracts) },
            { label: 'Transactions (24h)', value: fmt(counters.transactions24h) },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem 1.25rem' }}>
              <p style={{ color: 'var(--muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.45rem' }}>{label}</p>
              <p style={{ fontWeight: 700, fontSize: '1.15rem', margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {accounts.length === 0 ? (
        active.length ? (
          <>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Most active accounts right now</h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: '0 0 1rem' }}>
              Ranked by appearances in the latest ~120 transactions on the node (live, no indexer). The all-time balance ranking returns once the Blockscout index is reachable again.
            </p>
            <ActiveAccountsTable accounts={active} />
          </>
        ) : (
          <div className="tokens-empty">
            Account rankings are temporarily unavailable. Please retry shortly.
          </div>
        )
      ) : (
        <div className="dsf-wrap">
          <div className="dsf-head" style={{ gridTemplateColumns: COL }}>
            {HEADS.map(h => <div key={h} className="dsf-head-cell">{h}</div>)}
          </div>
          <div className="dsf-window" style={{ height: 480 }}>
            <div className="dsf-track" style={{ '--dur': dur } as React.CSSProperties}>
              {doubled.map((account, i) => {
                const balance = account.coin_balance
                  ? parseFloat(formatEther(BigInt(account.coin_balance))).toFixed(4)
                  : '0';
                return (
                  <div key={`${account.hash}-${i}`} className="dsf-row" style={{ gridTemplateColumns: COL }}>
                    <div className="dsf-cell rank-cell">{(i % accounts.length) + 1}</div>
                    <div className="dsf-cell" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      <Link href={`/address/${account.hash}`}>
                        {account.hash.slice(0, 10)}…{account.hash.slice(-8)}
                      </Link>
                    </div>
                    <div className="dsf-cell">
                      {account.name ? (
                        <span style={{ fontWeight: 500 }}>{account.name}</span>
                      ) : (
                        <span style={{
                          fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: 4,
                          background: account.is_contract ? 'rgba(99,91,255,0.1)' : 'rgba(34,197,94,0.1)',
                          color: account.is_contract ? 'var(--primary)' : 'var(--success)',
                          fontWeight: 600,
                        }}>
                          {account.is_contract ? 'Contract' : 'Wallet'}
                        </span>
                      )}
                    </div>
                    <div className="dsf-cell" style={{ fontWeight: 600 }}>{balance} ETH</div>
                    <div className="dsf-cell muted-cell">
                      {account.transactions_count ? parseInt(account.transactions_count).toLocaleString() : '—'}
                    </div>
                    <div className="dsf-cell muted-cell">{account.token_count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
        {accounts.length ? 'Data from Blockscout · sorted by native ETH balance' : 'Live data from the Robinhood Chain RPC node · network totals from Blockscout stats'} · updated every 2 minutes
      </p>
    </div>
  );
}
