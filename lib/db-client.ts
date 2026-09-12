import { Pool, types } from 'pg';

// pg hands NUMERIC / BIGINT back as strings to preserve precision. Every numeric column
// in this schema is a display value (prices, volumes, counts) that the pages format with
// toFixed()/toLocaleString(), so parse them as numbers once here instead of at every
// call site. Raw token supplies live in TEXT columns and are unaffected.
types.setTypeParser(types.builtins.NUMERIC, value => (value === null ? null : Number(value)));
types.setTypeParser(types.builtins.INT8, value => (value === null ? null : Number(value)));

// ── Types matching db/schema.sql ──────────────────────────────

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

// ── Client (shared connection pool, safe to import in RSC) ────
// Reused across hot-reloads in dev so we don't exhaust the connection limit.

declare global {
  var __hoodscanPool: Pool | undefined;
}

// Connection options shared by the app and the sync/snapshot scripts.
// Two quirks of the provisioned DATABASE_URL (DigitalOcean PgBouncer):
//  - `?sslmode=require` in the URL is parsed by pg into `ssl: {}`, which
//    OVERRIDES the `ssl` option passed here and re-enables CA verification
//    ("self-signed certificate in certificate chain"). Strip it and pass ssl
//    explicitly so rejectUnauthorized:false actually applies.
//  - `statement_timeout` is sent as a startup parameter, which PgBouncer
//    rejects ("unsupported startup parameter"). Use pg's client-side
//    `query_timeout` instead.
// AnySites injects DATABASE_URL as a read-only system variable, and the value it
// injects names a PgBouncer pool that does not exist ("no such database"). The
// working connection string (from the platform's GET /database) can be supplied
// via HOODSCAN_DATABASE_URL, which is a normal, editable env var and takes priority.
export const databaseUrl = (): string | undefined =>
  process.env.HOODSCAN_DATABASE_URL || process.env.DATABASE_URL || undefined;

export function poolConfig(url: string | undefined, queryTimeoutMs: number) {
  let connectionString = url;
  let ssl: false | { rejectUnauthorized: boolean } = { rejectUnauthorized: false };
  if (url) {
    try {
      const u = new URL(url);
      if (u.searchParams.get('sslmode') === 'disable') ssl = false;
      for (const k of ['sslmode', 'ssl', 'pgbouncer']) u.searchParams.delete(k);
      connectionString = u.toString();
    } catch {
      // Not a URL (e.g. test fixtures) — pass through untouched.
    }
  }
  return { connectionString, ssl, query_timeout: queryTimeoutMs };
}

function createPool(): Pool {
  // DATABASE_URL may be unset at build time (e.g. `next build` in Docker,
  // which prerenders static pages without runtime env vars). Don't throw
  // here — let queries fail individually so callers can degrade gracefully.
  return new Pool({
    ...poolConfig(databaseUrl(), 5000),
    max: 5,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 30000,
  });
}

export const pool = global.__hoodscanPool ?? createPool();
if (process.env.NODE_ENV !== 'production') global.__hoodscanPool = pool;
