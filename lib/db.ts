// ── Query helpers for Next.js RSC pages ──────────────────────
// All functions read from Supabase (populated by scripts/sync.ts).
// Return empty arrays on error so pages degrade gracefully.

import { supabase, type DbToken, type DbPool, type DbDex, type DbDailyStat } from './supabase';

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
  const { data, error } = await supabase
    .from('tokens')
    .select('*')
    .not('rank_trending', 'is', null)
    .order('rank_trending', { ascending: true })
    .limit(limit);
  if (error) console.error('[db] getTrendingTokens', error.message);
  return data ?? [];
}

export async function getNewTokens(limit = 50): Promise<DbToken[]> {
  const { data, error } = await supabase
    .from('tokens')
    .select('*')
    .eq('is_new', true)
    .order('first_seen_at', { ascending: false })
    .limit(limit);
  if (error) console.error('[db] getNewTokens', error.message);
  return data ?? [];
}

export async function getTopGainers(limit = 50): Promise<DbToken[]> {
  const { data, error } = await supabase
    .from('tokens')
    .select('*')
    .not('rank_gainers', 'is', null)
    .order('rank_gainers', { ascending: true })
    .limit(limit);
  if (error) console.error('[db] getTopGainers', error.message);
  return data ?? [];
}

export async function getMostTraded(limit = 50): Promise<DbToken[]> {
  const { data, error } = await supabase
    .from('tokens')
    .select('*')
    .not('rank_volume', 'is', null)
    .order('rank_volume', { ascending: true })
    .limit(limit);
  if (error) console.error('[db] getMostTraded', error.message);
  return data ?? [];
}

export async function getMostHeld(limit = 50): Promise<DbToken[]> {
  const { data, error } = await supabase
    .from('tokens')
    .select('*')
    .not('rank_holders', 'is', null)
    .order('rank_holders', { ascending: true })
    .limit(limit);
  if (error) console.error('[db] getMostHeld', error.message);
  return data ?? [];
}

export async function getHighLiquidity(limit = 50): Promise<DbToken[]> {
  const { data, error } = await supabase
    .from('tokens')
    .select('*')
    .not('rank_liquidity', 'is', null)
    .order('rank_liquidity', { ascending: true })
    .limit(limit);
  if (error) console.error('[db] getHighLiquidity', error.message);
  return data ?? [];
}

// ── Token sub-pages ──────────────────────────────────────────

export async function getTokenPools(tokenAddress: string): Promise<DbPool[]> {
  const { data, error } = await supabase
    .from('token_pools')
    .select('*')
    .eq('token_address', tokenAddress.toLowerCase())
    .order('liquidity_usd', { ascending: false, nullsFirst: false })
    .limit(30);
  if (error) console.error('[db] getTokenPools', error.message);
  return data ?? [];
}

// ── DEX overview ─────────────────────────────────────────────

export async function getDexes(): Promise<DbDex[]> {
  const { data, error } = await supabase
    .from('dexes')
    .select('*')
    .order('total_volume_24h', { ascending: false, nullsFirst: false })
    .limit(20);
  if (error) console.error('[db] getDexes', error.message);
  return data ?? [];
}

export async function getDexPools(dexId: string, limit = 50): Promise<DbPool[]> {
  const { data, error } = await supabase
    .from('token_pools')
    .select('*')
    .eq('dex_id', dexId)
    .order('liquidity_usd', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) console.error('[db] getDexPools', error.message);
  return data ?? [];
}

// ── Stats ────────────────────────────────────────────────────

export async function getDailyStats(limit = 30): Promise<DbDailyStat[]> {
  const { data, error } = await supabase
    .from('daily_stats')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit);
  if (error) console.error('[db] getDailyStats', error.message);
  return data ?? [];
}
