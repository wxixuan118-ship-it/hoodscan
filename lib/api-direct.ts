/**
 * Direct API helpers — fetch from GeckoTerminal + Blockscout without a database.
 * Used by all ranking pages as a zero-DB alternative to lib/db.ts.
 */

import type { DbToken } from './db-client';

const GT  = 'https://api.geckoterminal.com/api/v2';
const BS  = 'https://robinhoodchain.blockscout.com/api/v2';
const NET = 'robinhood';

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

type PoolRow = {
  addr:             string;
  price_usd:        number | null;
  price_change_24h: number | null;
  volume_24h:       number | null;
  liquidity:        number | null;
  market_cap:       number | null;
  first_seen_at:    string;
};

type TokenMeta = { name: string; symbol: string; icon_url: string | null };

async function gtFetch(
  path: string,
  revalidate: number,
): Promise<{ data: any[]; included?: any[] } | null> {
  const sep = path.includes('?') ? '&' : '?';
  try {
    const res = await fetch(`${GT}/networks/${NET}/${path}${sep}include=base_token,dex`, {
      next: { revalidate },
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(12_000),
    });
    return res.ok ? (res.json() as Promise<{ data: any[]; included?: any[] }>) : null;
  } catch {
    return null;
  }
}

function parseGtResponse(data: { data: any[]; included?: any[] }) {
  const meta = new Map<string, TokenMeta>();
  for (const inc of data.included ?? []) {
    if (inc.type === 'token') {
      const addr = (inc.attributes.address as string).toLowerCase();
      meta.set(addr, {
        name:     inc.attributes.name      ?? 'Unknown',
        symbol:   inc.attributes.symbol    ?? '—',
        icon_url: inc.attributes.image_url ?? null,
      });
    }
  }

  const seen = new Set<string>();
  const rows: PoolRow[] = [];
  for (const pool of data.data ?? []) {
    const id = pool.relationships?.base_token?.data?.id as string | undefined;
    if (!id) continue;
    const addr = id.replace(`${NET}_`, '').toLowerCase();
    if (seen.has(addr)) continue;
    seen.add(addr);
    const a = pool.attributes;
    rows.push({
      addr,
      price_usd:        num(a.base_token_price_usd),
      price_change_24h: num(a.price_change_percentage?.h24),
      volume_24h:       num(a.volume_usd?.h24),
      liquidity:        num(a.reserve_in_usd),
      market_cap:       num(a.market_cap_usd),
      first_seen_at:    a.pool_created_at ?? new Date().toISOString(),
    });
  }

  return { meta, rows };
}

async function enrichHolders(
  rows: PoolRow[],
  meta: Map<string, TokenMeta>,
  revalidate: number,
): Promise<Map<string, number>> {
  const holderMap = new Map<string, number>();
  await Promise.allSettled(
    rows.map(async ({ addr }) => {
      try {
        const res = await fetch(`${BS}/tokens/${addr}`, {
          next: { revalidate },
          headers: { accept: 'application/json' },
          signal: AbortSignal.timeout(5_000),
        });
        if (!res.ok) return;
        const d = await res.json();
        holderMap.set(addr, Number(d.holders_count ?? 0));
        if (d.icon_url) {
          const m = meta.get(addr);
          if (m && !m.icon_url) m.icon_url = d.icon_url;
        }
      } catch { /* best-effort */ }
    })
  );
  return holderMap;
}

function toDbToken(
  r: PoolRow,
  meta: Map<string, TokenMeta>,
  holderMap: Map<string, number>,
  rank: number,
  rankKey: 'rank_trending' | 'rank_gainers' | 'rank_volume' | 'rank_liquidity',
  now: string,
): DbToken {
  const m = meta.get(r.addr);
  return {
    address:           r.addr,
    name:              m?.name     ?? 'Unknown Token',
    symbol:            m?.symbol   ?? '—',
    decimals:          18,
    total_supply:      null,
    holders_count:     holderMap.get(r.addr) ?? 0,
    type:              'ERC-20',
    reputation:        null,
    icon_url:          m?.icon_url ?? null,
    contract_verified: false,
    creator_address:   null,
    creation_tx:       null,
    proxy_type:        null,
    is_scam:           false,
    price_usd:         r.price_usd,
    price_change_24h:  r.price_change_24h,
    volume_24h:        r.volume_24h,
    market_cap:        r.market_cap,
    liquidity:         r.liquidity,
    dex_name:          null,
    top_pool_address:  null,
    price_source:      'GeckoTerminal',
    rank_trending:     rankKey === 'rank_trending'  ? rank : null,
    rank_gainers:      rankKey === 'rank_gainers'   ? rank : null,
    rank_volume:       rankKey === 'rank_volume'    ? rank : null,
    rank_holders:      null,
    rank_liquidity:    rankKey === 'rank_liquidity' ? rank : null,
    is_new:            false,
    first_seen_at:     r.first_seen_at,
    updated_at:        now,
  } satisfies DbToken;
}

// ── Public API ────────────────────────────────────────────────

/** Trending / New Tokens / Most Traded — single GT pools endpoint */
export async function fetchFromGtPools(
  poolPath: string,
  rankKey: 'rank_trending' | 'rank_gainers' | 'rank_volume' | 'rank_liquidity',
  revalidate: number,
): Promise<DbToken[]> {
  const data = await gtFetch(poolPath, revalidate);
  if (!data) return [];
  const { meta, rows } = parseGtResponse(data);
  const holderMap = await enrichHolders(rows, meta, revalidate);
  const now = new Date().toISOString();
  return rows.map((r, i) => toDbToken(r, meta, holderMap, i + 1, rankKey, now));
}

/** Top Gainers — merges trending + volume pools, sorts by 24h price change */
export async function fetchTopGainers(revalidate: number): Promise<DbToken[]> {
  const [t, v] = await Promise.allSettled([
    gtFetch('trending_pools', revalidate),
    gtFetch('pools?sort=h24_volume_usd_desc', revalidate),
  ]);

  const allMeta = new Map<string, TokenMeta>();
  const allRows = new Map<string, PoolRow>();

  for (const result of [t, v]) {
    if (result.status !== 'fulfilled' || !result.value) continue;
    const { meta, rows } = parseGtResponse(result.value);
    for (const [k, v] of meta) if (!allMeta.has(k)) allMeta.set(k, v);
    for (const r of rows) if (!allRows.has(r.addr)) allRows.set(r.addr, r);
  }

  const rows = Array.from(allRows.values())
    .filter(r => r.price_change_24h !== null)
    .sort((a, b) => (b.price_change_24h ?? 0) - (a.price_change_24h ?? 0));

  const holderMap = await enrichHolders(rows, allMeta, revalidate);
  const now = new Date().toISOString();
  return rows.map((r, i) => toDbToken(r, allMeta, holderMap, i + 1, 'rank_gainers', now));
}

/** Most Held — Blockscout token list sorted by holders_count */
export async function fetchTopByHolders(pages = 2, revalidate = 600): Promise<DbToken[]> {
  const now = new Date().toISOString();
  const allTokens: DbToken[] = [];
  let nextPageParams: string | null = null;

  for (let p = 0; p < pages; p++) {
    try {
      const qs: string = nextPageParams ? `?type=ERC-20&${nextPageParams}` : '?type=ERC-20';
      const res = await fetch(`${BS}/tokens${qs}`, {
        next: { revalidate },
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) break;
      const data = await res.json();
      for (const t of data.items ?? []) {
        allTokens.push({
          address:           (t.address_hash as string).toLowerCase(),
          name:              t.name   ?? 'Unknown Token',
          symbol:            t.symbol ?? '—',
          decimals:          Number(t.decimals ?? 18),
          total_supply:      t.total_supply ?? null,
          holders_count:     Number(t.holders_count ?? 0),
          type:              t.type ?? 'ERC-20',
          reputation:        t.reputation ?? null,
          icon_url:          t.icon_url ?? null,
          contract_verified: false,
          creator_address:   null,
          creation_tx:       null,
          proxy_type:        null,
          is_scam:           false,
          price_usd:         t.exchange_rate ? Number(t.exchange_rate) : null,
          price_change_24h:  null,
          volume_24h:        t.volume_24h ? Number(t.volume_24h) : null,
          market_cap:        t.circulating_market_cap ? Number(t.circulating_market_cap) : null,
          liquidity:         null,
          dex_name:          null,
          top_pool_address:  null,
          price_source:      'Blockscout',
          rank_trending:     null,
          rank_gainers:      null,
          rank_volume:       null,
          rank_holders:      0,
          rank_liquidity:    null,
          is_new:            false,
          first_seen_at:     now,
          updated_at:        now,
        } satisfies DbToken);
      }
      if (!data.next_page_params || !data.items?.length) break;
      nextPageParams = new URLSearchParams(
        Object.entries(data.next_page_params as Record<string, string>)
          .map(([k, v]) => [k, String(v)])
      ).toString();
    } catch {
      break;
    }
  }

  return allTokens
    .sort((a, b) => b.holders_count - a.holders_count)
    .map((t, i) => ({ ...t, rank_holders: i + 1 }));
}
