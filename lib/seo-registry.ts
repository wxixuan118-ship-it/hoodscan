import { pool } from './db-client';

// Small process-local registry protects ISR's disk cache from arbitrary address URLs.
// A miss never starts an upstream call or creates an ISR entry. Refresh is coalesced.
let registry: Set<string> | undefined;
let refreshedAt = 0;
let retryAfter = 0;
let pending: Promise<Set<string>> | undefined;
export async function publishedRoutes(): Promise<Set<string>> {
  if (Date.now() < retryAfter) throw new Error('Snapshot directory unavailable');
  if (registry && Date.now() - refreshedAt < 60_000) return registry;
  if (!pending) {
    pending = pool.query<{ kind: string; address: string }>(
      "SELECT kind, address FROM seo_snapshots WHERE kind IN ('token','address') ORDER BY fetched_at DESC LIMIT 10000",
    ).then(({ rows }) => {
      registry = new Set(rows.map(row => `${row.kind}/${row.address}`));
      refreshedAt = Date.now();
      return registry;
    }).catch(error => { retryAfter = Date.now() + 60_000; throw error; }).finally(() => { pending = undefined; });
  }
  return pending;
}
