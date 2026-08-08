-- ============================================================
-- HoodScan · Postgres Schema
-- Run this against DATABASE_URL to initialise the DB, e.g.:
--   psql "$DATABASE_URL" -f db/schema.sql
-- ============================================================

-- Core token table
-- Updated every 5 minutes by scripts/sync.ts
-- Holds both on-chain data (Blockscout) and market data (GeckoTerminal)
CREATE TABLE IF NOT EXISTS tokens (
  address            TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  symbol             TEXT NOT NULL,
  decimals           INTEGER NOT NULL DEFAULT 18,
  total_supply       TEXT,
  holders_count      INTEGER NOT NULL DEFAULT 0,
  type               TEXT NOT NULL DEFAULT 'ERC-20',
  reputation         TEXT,
  icon_url           TEXT,
  -- Contract info
  contract_verified  BOOLEAN DEFAULT FALSE,
  creator_address    TEXT,
  creation_tx        TEXT,
  proxy_type         TEXT,
  is_scam            BOOLEAN DEFAULT FALSE,
  -- Market data (GeckoTerminal)
  price_usd          NUMERIC(36, 18),
  price_change_24h   NUMERIC(10, 4),
  volume_24h         NUMERIC(20, 4),
  market_cap         NUMERIC(20, 4),
  liquidity          NUMERIC(20, 4),
  dex_name           TEXT,
  top_pool_address   TEXT,
  price_source       TEXT DEFAULT 'Blockscout',
  -- Pre-computed rankings (NULL = not in that category)
  rank_trending      INTEGER,
  rank_gainers       INTEGER,
  rank_volume        INTEGER,
  rank_holders       INTEGER,
  rank_liquidity     INTEGER,
  -- Flags
  is_new             BOOLEAN DEFAULT FALSE,
  -- Timestamps
  first_seen_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- DEX liquidity pools (one token → many pools)
CREATE TABLE IF NOT EXISTS token_pools (
  pool_address      TEXT PRIMARY KEY,
  token_address     TEXT NOT NULL REFERENCES tokens(address) ON DELETE CASCADE,
  dex_name          TEXT,
  dex_id            TEXT,
  liquidity_usd     NUMERIC(20, 4),
  volume_24h        NUMERIC(20, 4),
  price_usd         NUMERIC(36, 18),
  price_change_24h  NUMERIC(10, 4),
  tx_count_24h      INTEGER,
  base_symbol       TEXT,
  quote_symbol      TEXT,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- DEX aggregate stats (refreshed alongside token_pools)
CREATE TABLE IF NOT EXISTS dexes (
  dex_id            TEXT PRIMARY KEY,
  dex_name          TEXT NOT NULL,
  pool_count        INTEGER DEFAULT 0,
  total_liquidity   NUMERIC(20, 4),
  total_volume_24h  NUMERIC(20, 4),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Daily network stats (appended once per day)
CREATE TABLE IF NOT EXISTS daily_stats (
  date               DATE PRIMARY KEY,
  total_transactions BIGINT,
  active_addresses   INTEGER,
  new_contracts      INTEGER,
  avg_gas_gwei       NUMERIC(10, 6),
  token_transfers    BIGINT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tokens_rank_trending  ON tokens(rank_trending)  WHERE rank_trending  IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tokens_rank_gainers   ON tokens(rank_gainers)   WHERE rank_gainers   IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tokens_rank_volume    ON tokens(rank_volume)    WHERE rank_volume    IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tokens_rank_holders   ON tokens(rank_holders)   WHERE rank_holders   IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tokens_rank_liquidity ON tokens(rank_liquidity) WHERE rank_liquidity IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tokens_is_new         ON tokens(first_seen_at DESC) WHERE is_new = TRUE;
CREATE INDEX IF NOT EXISTS idx_tokens_holders        ON tokens(holders_count DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_volume         ON tokens(volume_24h DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_tokens_liquidity_idx  ON tokens(liquidity DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_pools_token           ON token_pools(token_address);
CREATE INDEX IF NOT EXISTS idx_pools_liquidity       ON token_pools(liquidity_usd DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_pools_dex             ON token_pools(dex_id);
