-- Apply before deploying the snapshot reader. Safe to re-run.
CREATE TABLE IF NOT EXISTS seo_snapshots (
  kind text NOT NULL CHECK (kind IN ('token', 'address', 'network')),
  address text NOT NULL,
  payload jsonb NOT NULL,
  indexable boolean NOT NULL DEFAULT false,
  content_updated_at timestamptz NOT NULL DEFAULT now(),
  fetched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, address),
  CHECK (address = lower(address))
);
CREATE INDEX IF NOT EXISTS seo_snapshots_sitemap
  ON seo_snapshots(kind, address) WHERE indexable;
