export const SNAPSHOT_UPSERT = `INSERT INTO seo_snapshots (kind, address, payload, indexable) VALUES ($1,$2,$3::jsonb,$4)
  ON CONFLICT (kind,address) DO UPDATE SET payload = EXCLUDED.payload, indexable = EXCLUDED.indexable,
    fetched_at = now(), content_updated_at = CASE
    WHEN seo_snapshots.payload IS DISTINCT FROM EXCLUDED.payload OR seo_snapshots.indexable IS DISTINCT FROM EXCLUDED.indexable
    THEN now() ELSE seo_snapshots.content_updated_at END`;
