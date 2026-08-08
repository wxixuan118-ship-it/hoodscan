// ── Query helpers for Next.js RSC pages ──────────────────────
// All functions read from Postgres (populated by scripts/sync.ts).
// Return empty arrays/null on error so pages degrade gracefully.

import { pool, type DbToken, type DbPool, type DbDex, type DbDailyStat } from './db-client';

const fmt = new Intl.NumberFormat('en-US');

// ── Utility ──────────────────────────────────────────────────

export function fmtUsd(v: number | null, compact = true): string {
  if (v === null || v === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: 2,
  }).format(v);
}

export function fmtPct(v: number | null): string {
  if (v === null || v === undefined) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}

export function fmtNum(v: number | null): string {
  if (v === null || v === undefined) return '—';
  return fmt.format(v);
}

export function fmtPrice(v: number | null): string {
  if (v === null) return '—';
  return `$${v.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: v >= 1 ? 4 : 8,
  })}`;
}

// ── Ranking pages ─────────────────────────────────────────────

export async function getTrendingTokens(limit = 50): Promise<DbToken[]> {
  try {
    const { rows } = await pool.query<DbToken>(
      `SELECT * FROM tokens WHERE rank_trending IS NOT NULL ORDER BY rank_trending ASC LIMIT $1`,
      [limit]
    );
    return rows;
  } catch (err) {
    console.error('[db] getTrendingTokens', err);
    return [];
  }
}

export async function getNewTokens(limit = 50): Promise<DbToken[]> {
  try {
    const { rows } = await pool.query<DbToken>(
      `SELECT * FROM tokens WHERE is_new = true ORDER BY first_seen_at DESC LIMIT $1`,
      [limit]
    );
    return rows;
  } catch (err) {
    console.error('[db] getNewTokens', err);
    return [];
  }
}

export async function getTopGainers(limit = 50): Promise<DbToken[]> {
  try {
    const { rows } = await pool.query<DbToken>(
      `SELECT * FROM tokens WHERE rank_gainers IS NOT NULL ORDER BY rank_gainers ASC LIMIT $1`,
      [limit]
    );
    return rows;
  } catch (err) {
    console.error('[db] getTopGainers', err);
    return [];
  }
}

export async function getMostTraded(limit = 50): Promise<DbToken[]> {
  try {
    const { rows } = await pool.query<DbToken>(
      `SELECT * FROM tokens WHERE rank_volume IS NOT NULL ORDER BY rank_volume ASC LIMIT $1`,
      [limit]
    );
    return rows;
  } catch (err) {
    console.error('[db] getMostTraded', err);
    return [];
  }
}

export async function getMostHeld(limit = 50): Promise<DbToken[]> {
  try {
    const { rows } = await pool.query<DbToken>(
      `SELECT * FROM tokens WHERE rank_holders IS NOT NULL ORDER BY rank_holders ASC LIMIT $1`,
      [limit]
    );
    return rows;
  } catch (err) {
    console.error('[db] getMostHeld', err);
    return [];
  }
}

export async function getHighLiquidity(limit = 50): Promise<DbToken[]> {
  try {
    const { rows } = await pool.query<DbToken>(
      `SELECT * FROM tokens WHERE rank_liquidity IS NOT NULL ORDER BY rank_liquidity ASC LIMIT $1`,
      [limit]
    );
    return rows;
  } catch (err) {
    console.error('[db] getHighLiquidity', err);
    return [];
  }
}

// ── Token sub-pages ──────────────────────────────────────────

export async function getTokenByAddress(address: string): Promise<DbToken | null> {
  try {
    const { rows } = await pool.query<DbToken>(
      `SELECT * FROM tokens WHERE address = $1 LIMIT 1`,
      [address.toLowerCase()]
    );
    return rows[0] ?? null;
  } catch (err) {
    console.error('[db] getTokenByAddress', err);
    return null;
  }
}

export async function getTokenPools(tokenAddress: string): Promise<DbPool[]> {
  try {
    const { rows } = await pool.query<DbPool>(
      `SELECT * FROM token_pools WHERE token_address = $1
       ORDER BY liquidity_usd DESC NULLS LAST LIMIT 30`,
      [tokenAddress.toLowerCase()]
    );
    return rows;
  } catch (err) {
    console.error('[db] getTokenPools', err);
    return [];
  }
}

// ── DEX overview ─────────────────────────────────────────────

export async function getDexes(): Promise<DbDex[]> {
  try {
    const { rows } = await pool.query<DbDex>(
      `SELECT * FROM dexes ORDER BY total_volume_24h DESC NULLS LAST LIMIT 20`
    );
    return rows;
  } catch (err) {
    console.error('[db] getDexes', err);
    return [];
  }
}

export async function getDexPools(dexId: string, limit = 50): Promise<DbPool[]> {
  try {
    const { rows } = await pool.query<DbPool>(
      `SELECT * FROM token_pools WHERE dex_id = $1
       ORDER BY liquidity_usd DESC NULLS LAST LIMIT $2`,
      [dexId, limit]
    );
    return rows;
  } catch (err) {
    console.error('[db] getDexPools', err);
    return [];
  }
}

// ── Stats ────────────────────────────────────────────────────

export async function getDailyStats(limit = 30): Promise<DbDailyStat[]> {
  try {
    const { rows } = await pool.query<DbDailyStat>(
      `SELECT * FROM daily_stats ORDER BY date DESC LIMIT $1`,
      [limit]
    );
    return rows;
  } catch (err) {
    console.error('[db] getDailyStats', err);
    return [];
  }
}

// ── SEO (sitemap) ────────────────────────────────────────────

export type SitemapToken = { address: string; updated_at: string; holders_count: number };

export async function getSitemapTokens(limit = 5000): Promise<SitemapToken[]> {
  try {
    const { rows } = await pool.query<SitemapToken>(
      `SELECT address, updated_at, holders_count FROM tokens
       ORDER BY holders_count DESC LIMIT $1`,
      [limit]
    );
    return rows;
  } catch (err) {
    console.error('[db] getSitemapTokens', err);
    return [];
  }
}
