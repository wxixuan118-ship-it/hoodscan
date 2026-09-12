// Ranking lists for the token pages. The database (filled by scripts/sync.ts every
// 5 minutes from GeckoTerminal + Blockscout) is the primary source: it is already
// bounded, cheap and survives either upstream going away. The live api-direct
// fetchers are only a fallback for a cold/empty database.
import type { DbToken } from './db-client';
import { getTrendingTokens, getMostTraded, getTopGainers, getNewTokens, getMostHeld, getHighLiquidity } from './db';
import { fetchFromGtPools, fetchTopGainers, fetchTopByHolders } from './api-direct';

export type RankingKind = 'trending' | 'most-traded' | 'top-gainers' | 'new' | 'most-held' | 'high-liquidity';

const fromDb: Record<RankingKind, (limit: number) => Promise<DbToken[]>> = {
  'trending':       getTrendingTokens,
  'most-traded':    getMostTraded,
  'top-gainers':    getTopGainers,
  'new':            getNewTokens,
  'most-held':      getMostHeld,
  'high-liquidity': getHighLiquidity,
};

const fromLive: Record<RankingKind, (revalidate: number) => Promise<DbToken[]>> = {
  'trending':       r => fetchFromGtPools('trending_pools', 'rank_trending', r),
  'most-traded':    r => fetchFromGtPools('pools?sort=h24_volume_usd_desc', 'rank_volume', r),
  'top-gainers':    r => fetchTopGainers(r),
  'new':            r => fetchFromGtPools('new_pools', 'rank_trending', r).then(rows => rows.map(t => ({ ...t, is_new: true }))),
  'most-held':      r => fetchTopByHolders(2, r),
  'high-liquidity': r => fetchFromGtPools('pools?sort=h24_volume_usd_desc', 'rank_liquidity', r),
};

export async function getRanking(kind: RankingKind, limit = 50, liveRevalidate = 300): Promise<DbToken[]> {
  const rows = await fromDb[kind](limit).catch(() => [] as DbToken[]);
  if (rows.length) return rows;
  return fromLive[kind](liveRevalidate).catch(() => [] as DbToken[]);
}
