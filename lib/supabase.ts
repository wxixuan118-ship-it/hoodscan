import { createClient } from '@supabase/supabase-js';

// ── Types matching supabase/schema.sql ────────────────────────

export type DbToken = {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  total_supply: string | null;
  holders_count: number;
  type: string;
  reputation: string | null;
  icon_url: string | null;
  contract_verified: boolean;
  creator_address: string | null;
  creation_tx: string | null;
  proxy_type: string | null;
  is_scam: boolean;
  price_usd: number | null;
  price_change_24h: number | null;
  volume_24h: number | null;
  market_cap: number | null;
  liquidity: number | null;
  dex_name: string | null;
  top_pool_address: string | null;
  price_source: string;
  rank_trending: number | null;
  rank_gainers: number | null;
  rank_volume: number | null;
  rank_holders: number | null;
  rank_liquidity: number | null;
  is_new: boolean;
  first_seen_at: string;
  updated_at: string;
};

export type DbPool = {
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

export type DbDex = {
  dex_id: string;
  dex_name: string;
  pool_count: number;
  total_liquidity: number | null;
  total_volume_24h: number | null;
  updated_at: string;
};

export type DbDailyStat = {
  date: string;
  total_transactions: number | null;
  active_addresses: number | null;
  new_contracts: number | null;
  avg_gas_gwei: number | null;
  token_transfers: number | null;
};

// ── Client (read-only, safe to use in RSC and browser) ────────
const url  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '';
const akey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(url, akey, {
  auth: { persistSession: false },
});
