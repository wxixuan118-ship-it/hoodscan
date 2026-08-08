#!/usr/bin/env tsx
/**
 * HoodScan · Data Sync Script
 *
 * Pulls data from Blockscout + GeckoTerminal and upserts into Supabase.
 * Run manually:  npx tsx scripts/sync.ts
 * Run in CI:     see .github/workflows/sync.yml
 *
 * Required env vars:
 *   SUPABASE_URL          – Supabase project URL
 *   SUPABASE_SERVICE_KEY  – Service role key (write access, never expose to browser)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local for local runs (GitHub Actions uses real env vars)
config({ path: resolve(process.cwd(), '.env.local') });

// ── Config ────────────────────────────────────────────────────

const SUPABASE_URL         = process.env.SUPABASE_URL         ?? '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ?? '';
const BS_URL   = 'https://robinhoodchain.blockscout.com/api/v2';
const GT_URL   = 'https://api.geckoterminal.com/api/v2';
const NETWORK  = 'robinhood';
const NEW_TOKEN_DAYS = 14; // tokens first seen within N days are marked "new"

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ── Types ────────────────────────────────────────────────────

type ApiToken = {
  address_hash: string;
  name: string;
  symbol: string;
  decimals: string | null;
  total_supply: string | null;
  holders_count: string;
  exchange_rate: string | null;
  circulating_market_cap: string | null;
  volume_24h: string | null;
  icon_url: string | null;
  type: string;
  reputation: string;
};

type GtItem = { id: string; attributes: Record<string, any>; relationships?: Record<string, any> };

// ── Fetch helpers ────────────────────────────────────────────

async function bsFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BS_URL}${path}`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Blockscout ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

async function gtFetch<T>(path: string, retries = 1): Promise<T> {
  const res = await fetch(`${GT_URL}${path}`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 429 && retries > 0) {
    const wait = 60_000; // wait 60s then retry once
    console.warn(`[GT] 429 rate limit on ${path} — waiting ${wait / 1000}s before retry`);
    await sleep(wait);
    return gtFetch<T>(path, retries - 1);
  }
  if (!res.ok) throw new Error(`GeckoTerminal ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function poolAddr(id: string): string {
  return id.replace(`${NETWORK}_`, '').toLowerCase();
}

function tokenAddr(id: string): string {
  return id.replace(`${NETWORK}_`, '').toLowerCase();
}

// ── Step 1: Fetch tokens from Blockscout (paginated) ─────────

async function fetchBlockscoutTokens(): Promise<ApiToken[]> {
  const tokens: ApiToken[] = [];
  let nextPageParams: string | null = null;
  let page = 0;
  const MAX_PAGES = 10; // ~500 tokens max per sync run

  while (page < MAX_PAGES) {
    const bsPath: string = nextPageParams
      ? `/tokens?type=ERC-20&${nextPageParams}`
      : '/tokens?type=ERC-20';
    try {
      const data: { items: ApiToken[]; next_page_params: Record<string, string> | null } =
        await bsFetch<{ items: ApiToken[]; next_page_params: Record<string, string> | null }>(bsPath);
      tokens.push(...data.items);
      if (!data.next_page_params || data.items.length === 0) break;
      const params: URLSearchParams = new URLSearchParams(
        Object.entries(data.next_page_params).map(([k, v]) => [k, String(v)])
      );
      nextPageParams = params.toString();
      page++;
      await sleep(300); // respect rate limits
      } catch (err) {
      console.warn('[BS] tokens page error:', err);
      break;
    }
  }
  console.log(`[BS] fetched ${tokens.length} tokens`);
  return tokens;
}

// ── Step 2: Enrich with GeckoTerminal price data ──────────────

type PriceMap = Map<string, {
  price_usd: number | null;
  price_change_24h: number | null;
  volume_24h: number | null;
  market_cap: number | null;
  liquidity: number | null;
  dex_name: string | null;
  top_pool_address: string | null;
}>;

async function fetchGtPrices(addresses: string[]): Promise<PriceMap> {
  const map: PriceMap = new Map();
  const batches = chunks(addresses, 30);

  for (const batch of batches) {
    try {
      const data = await gtFetch<{ data: GtItem[] }>(
        `/networks/${NETWORK}/tokens/multi/${batch.join(',')}`
      );
      for (const item of data.data) {
        const addr = (item.attributes.address as string).toLowerCase();
        const topPoolRel = item.relationships?.top_pools?.data;
        const topPoolId  = Array.isArray(topPoolRel) && topPoolRel[0] ? topPoolRel[0].id : null;
        const topPool    = topPoolId ? poolAddr(topPoolId) : null;
        map.set(addr, {
          price_usd:        num(item.attributes.price_usd),
          price_change_24h: null,          // fetched via pools below
          volume_24h:       num(item.attributes.volume_usd?.h24),
          market_cap:       num(item.attributes.market_cap_usd),
          liquidity:        num(item.attributes.total_reserve_in_usd),
          dex_name:         null,
          top_pool_address: topPool,
        });
      }
      await sleep(1500);
    } catch (err) {
      console.warn('[GT] price batch error:', err);
    }
  }
  return map;
}

// ── Step 3: Fetch GeckoTerminal pools (trending, new, by-volume) ──

type PoolRow = {
  pool_address: string;
  token_address: string;
  dex_name: string | null;
  dex_id: string | null;
  liquidity_usd: number | null;
  volume_24h: number | null;
  price_usd: number | null;
  price_change_24h: number | null;
  tx_count_24h: number | null;
  base_symbol: string | null;
  quote_symbol: string | null;
  updated_at: string;
};

async function fetchGtPools(path: string): Promise<{ pools: PoolRow[]; tokenPriceChanges: Map<string, number> }> {
  const pools: PoolRow[] = [];
  const tokenPriceChanges = new Map<string, number>();

  try {
    const data = await gtFetch<{ data: GtItem[]; included?: GtItem[] }>(
      `/networks/${NETWORK}/${path}`
    );

    const dexNames = new Map<string, string>();
    for (const inc of data.included ?? []) {
      if (inc.id.startsWith('dex_') || !inc.id.includes('_')) {
        dexNames.set(inc.id, String(inc.attributes.name ?? inc.id));
      }
    }

    for (const item of data.data) {
      const attr = item.attributes;
      const baseTokenRel  = item.relationships?.base_token?.data;
      const dexRel        = item.relationships?.dex?.data;

      if (!baseTokenRel || !baseTokenRel.id) continue;

      const tokenAddr_ = tokenAddr(baseTokenRel.id);
      const dexId      = dexRel?.id ?? null;
      const pc24h      = num(attr.price_change_percentage?.h24);

      if (pc24h !== null) tokenPriceChanges.set(tokenAddr_, pc24h);

      pools.push({
        pool_address:     poolAddr(item.id),
        token_address:    tokenAddr_,
        dex_name:         dexId ? (dexNames.get(dexId) ?? dexId) : null,
        dex_id:           dexId,
        liquidity_usd:    num(attr.reserve_in_usd),
        volume_24h:       num(attr.volume_usd?.h24),
        price_usd:        num(attr.base_token_price_usd),
        price_change_24h: pc24h,
        tx_count_24h:     num(attr.transactions?.h24),
        base_symbol:      attr.name ? String(attr.name).split(' / ')[0] : null,
        quote_symbol:     attr.name ? String(attr.name).split(' / ')[1] : null,
        updated_at:       new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn(`[GT] pools fetch error (${path}):`, err);
  }

  return { pools, tokenPriceChanges };
}

// ── Step 4: Compute rankings ──────────────────────────────────

function rankBy<T>(items: T[], key: (t: T) => number | null, ascending = false): Map<string, number> {
  const sorted = items
    .filter(t => key(t) !== null)
    .sort((a, b) => {
      const va = key(a) ?? 0, vb = key(b) ?? 0;
      return ascending ? va - vb : vb - va;
    });
  const map = new Map<string, number>();
  sorted.forEach((t, i) => {
    // @ts-expect-error – items always have address
    map.set((t.address as string).toLowerCase(), i + 1);
  });
  return map;
}

// ── Step 5: Sync DEX aggregates ───────────────────────────────

async function syncDexes(pools: PoolRow[]) {
  const dexMap = new Map<string, { name: string; pools: number; liq: number; vol: number }>();
  for (const p of pools) {
    if (!p.dex_id) continue;
    const existing = dexMap.get(p.dex_id) ?? { name: p.dex_name ?? p.dex_id, pools: 0, liq: 0, vol: 0 };
    existing.pools++;
    existing.liq += p.liquidity_usd ?? 0;
    existing.vol += p.volume_24h ?? 0;
    dexMap.set(p.dex_id, existing);
  }
  const rows = Array.from(dexMap.entries()).map(([id, d]) => ({
    dex_id:           id,
    dex_name:         d.name,
    pool_count:       d.pools,
    total_liquidity:  d.liq,
    total_volume_24h: d.vol,
    updated_at:       new Date().toISOString(),
  }));
  if (!rows.length) return;
  const { error } = await db.from('dexes').upsert(rows, { onConflict: 'dex_id' });
  if (error) console.error('[DB] dexes upsert:', error.message);
  else console.log(`[DB] upserted ${rows.length} dexes`);
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  console.log('🔄 HoodScan sync started', new Date().toISOString());

  // 1. Blockscout tokens (always works, no rate limit)
  const bsTokens = await fetchBlockscoutTokens();


  // 2. GeckoTerminal pool rankings FIRST (only 4 API calls)
  //    Fetch these before price enrichment so we know which tokens matter
  console.log('[GT] fetching pool rankings...');
  const { pools: trendingPools, tokenPriceChanges: trendingPc } =
    await fetchGtPools('trending_pools?include=dex');
  await sleep(800);

  const { pools: newPools } = await fetchGtPools('new_pools?include=dex');
  await sleep(800);

  const { pools: volumePools, tokenPriceChanges: volumePc } =
    await fetchGtPools('pools?sort=h24_volume_usd_desc&include=dex&page=1');

  // Note: GT does not support h24_price_change_percentage_desc sort.
  // Gainer ranking is derived from price_change_24h collected across trending + volume pools.
  const gainerPools = [...trendingPools, ...volumePools]; // reuse for gainer ranking
  const gainerPc = new Map<string, number>([...trendingPc, ...volumePc]);

  // 3. Collect unique token addresses found in any pool
  //    Only fetch GT prices for THESE tokens (not all 500 from Blockscout)
  const poolTokenAddresses = new Set<string>([
    ...trendingPools.map(p => p.token_address),
    ...newPools.map(p => p.token_address),
    ...volumePools.map(p => p.token_address),
  ]);
  console.log(`[GT] ${poolTokenAddresses.size} unique token addresses found in pools — fetching prices for these only`);

  // 4. GeckoTerminal prices — ONLY for tokens seen in pools
  //    (dramatically fewer API calls: typically 1-2 batches vs 17)
  const priceMap = await fetchGtPrices(Array.from(poolTokenAddresses));

  // Merge all pools (dedup by pool_address)
  const allPoolsMap = new Map<string, PoolRow>();
  for (const p of [...trendingPools, ...newPools, ...volumePools, ...gainerPools]) {
    allPoolsMap.set(p.pool_address, p);
  }
  const allPools = Array.from(allPoolsMap.values());

  // Collect addresses that have GeckoTerminal pool data (for ranking)
  const newTokenAddresses = new Set(newPools.map(p => p.token_address));
  const trendingAddresses = trendingPools.map(p => p.token_address);
  const volumeAddresses   = volumePools.map(p => p.token_address);
  const gainerAddresses   = gainerPools.map(p => p.token_address);

  // ── PHASE A: Write Blockscout data immediately (no GT dependency) ──

  // Build base token rows from Blockscout only (no GT price yet)
  const baseTokenRows = bsTokens.map(t => ({
    address:          t.address_hash.toLowerCase(),
    name:             t.name || 'Unknown Token',
    symbol:           t.symbol || '—',
    decimals:         Number(t.decimals ?? 18),
    total_supply:     t.total_supply,
    holders_count:    Number(t.holders_count ?? 0),
    type:             t.type,
    reputation:       t.reputation,
    icon_url:         t.icon_url,
    price_usd:        num(t.exchange_rate),
    price_change_24h: null as number | null,
    volume_24h:       num(t.volume_24h),
    market_cap:       num(t.circulating_market_cap),
    liquidity:        null as number | null,
    dex_name:         null as string | null,
    top_pool_address: null as string | null,
    price_source:     'Blockscout',
    is_new:           newTokenAddresses.has(t.address_hash.toLowerCase()),
    updated_at:       new Date().toISOString(),
  }));

  // Write base data first — this always works even if GT is down
  for (const batch of chunks(baseTokenRows, 100)) {
    const { error } = await db.from('tokens').upsert(batch, { onConflict: 'address', ignoreDuplicates: false });
    if (error) console.error('[DB] base tokens upsert:', error.message);
  }
  console.log(`[DB] upserted ${baseTokenRows.length} base tokens (Blockscout)`);

  // Write holder rankings immediately from Blockscout data
  const holderRanks = rankBy(baseTokenRows, t => t.holders_count, false);
  const holderUpdates = baseTokenRows.map(t => ({
    ...t,
    rank_holders:   holderRanks.get(t.address) ?? null,
    rank_trending:  null as number | null,
    rank_volume:    null as number | null,
    rank_gainers:   null as number | null,
    rank_liquidity: null as number | null,
  }));
  for (const batch of chunks(holderUpdates, 100)) {
    const { error } = await db.from('tokens').upsert(batch, { onConflict: 'address' });
    if (error) console.error('[DB] holder rankings upsert:', error.message);
  }
  console.log('[DB] holder rankings written');

  // ── PHASE B: Enrich with GT price data (best-effort) ──

  // Build full token rows with GT price data merged in
  const tokenRows = baseTokenRows.map(t => {
    const price = priceMap.get(t.address);
    const pc24h = gainerPc.get(t.address) ?? volumePc.get(t.address) ?? trendingPc.get(t.address) ?? null;
    return {
      ...t,
      price_usd:        price?.price_usd ?? t.price_usd,
      price_change_24h: pc24h,
      volume_24h:       price?.volume_24h ?? t.volume_24h,
      market_cap:       price?.market_cap ?? t.market_cap,
      liquidity:        price?.liquidity ?? null,
      dex_name:         price?.dex_name ?? null,
      top_pool_address: price?.top_pool_address ?? null,
      price_source:     price ? 'GeckoTerminal' : 'Blockscout',
    };
  });

  // Overwrite with enriched data if any GT data arrived
  if (priceMap.size > 0) {
    for (const batch of chunks(tokenRows, 100)) {
      const { error } = await db.from('tokens').upsert(batch, { onConflict: 'address', ignoreDuplicates: false });
      if (error) console.error('[DB] enriched tokens upsert:', error.message);
    }
    console.log(`[DB] enriched ${priceMap.size} tokens with GT prices`);
  }

  // 9. Compute GT-based rankings
  //    Trending: order of trendingAddresses (GT's own ranking)
  const trendingRanks = new Map<string, number>();
  const seen = new Set<string>();
  let rank = 1;
  for (const addr of trendingAddresses) {
    if (!seen.has(addr)) { trendingRanks.set(addr, rank++); seen.add(addr); }
  }

  const volumeRanks  = new Map<string, number>();
  const seenV = new Set<string>();
  let rankV = 1;
  for (const addr of volumeAddresses) {
    if (!seenV.has(addr)) { volumeRanks.set(addr, rankV++); seenV.add(addr); }
  }

  const gainerRanks = new Map<string, number>();
  const seenG = new Set<string>();
  let rankG = 1;
  for (const addr of gainerAddresses) {
    if (!seenG.has(addr)) { gainerRanks.set(addr, rankG++); seenG.add(addr); }
  }

  // Liquidity ranking: from tokens with GT price data
  const liquidityRanks = rankBy(tokenRows, t => t.liquidity, false);

  // Write GT-based rankings (trending, volume, gainers, liquidity)
  if (trendingRanks.size > 0 || volumeRanks.size > 0 || gainerRanks.size > 0) {
    const rankUpdates = tokenRows.map(t => ({
      ...t,
      rank_trending:  trendingRanks.get(t.address)   ?? null,
      rank_volume:    volumeRanks.get(t.address)      ?? null,
      rank_gainers:   gainerRanks.get(t.address)      ?? null,
      rank_holders:   holderRanks.get(t.address)      ?? null,
      rank_liquidity: liquidityRanks.get(t.address)   ?? null,
    }));
    for (const batch of chunks(rankUpdates, 100)) {
      const { error } = await db.from('tokens').upsert(batch, { onConflict: 'address' });
      if (error) console.error('[DB] GT rankings upsert:', error.message);
    }
    console.log(`[DB] GT rankings written (trending:${trendingRanks.size} volume:${volumeRanks.size} gainers:${gainerRanks.size})`);
  } else {
    console.log('[DB] no GT pool data — skipping GT rankings (holder rankings already written)');
  }

  // 10. Upsert pools
  if (allPools.length) {
    // Only upsert pools whose token_address exists in tokens table
    const knownAddresses = new Set(tokenRows.map(t => t.address));
    const validPools = allPools.filter(p => knownAddresses.has(p.token_address));
    for (const batch of chunks(validPools, 100)) {
      const { error } = await db.from('token_pools').upsert(batch, { onConflict: 'pool_address' });
      if (error) console.error('[DB] pools upsert:', error.message);
    }
    console.log(`[DB] upserted ${validPools.length} pools`);

    // 11. Sync DEX aggregates
    await syncDexes(validPools);
  }

  console.log('✅ Sync complete', new Date().toISOString());
}

main().catch(err => {
  console.error('❌ Sync failed:', err);
  process.exit(1);
});
