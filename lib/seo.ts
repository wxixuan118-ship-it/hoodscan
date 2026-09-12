import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { pool } from './db-client';
import { isAddress, type Snapshot, type TokenSnapshot, type AddressSnapshot } from './seo-types';
export const SITE_URL = 'https://www.hood-chain.com';

// Do not swallow DB failures: ISR must retain the last good page, not cache a false 404.
const read = cache(async (kind: string, address: string) => {
  const { rows } = await pool.query(
    'SELECT payload, indexable, content_updated_at, fetched_at FROM seo_snapshots WHERE kind = $1 AND address = $2',
    [kind, address],
  );
  return rows[0] ?? null;
});
export const getTokenSnapshot = (address: string): Promise<Snapshot<TokenSnapshot> | null> =>
  isAddress(address) ? read('token', address.toLowerCase()) : Promise.resolve(null);
export const getAddressSnapshot = (address: string): Promise<Snapshot<AddressSnapshot> | null> =>
  isAddress(address) ? read('address', address.toLowerCase()) : Promise.resolve(null);
export const getNetworkSnapshot = (): Promise<Snapshot<{ gasPrice: string }> | null> => process.env.DATABASE_URL ? read('network', 'chain') : Promise.resolve(null);

export const getSeoSitemap = unstable_cache(async (kind: 'token' | 'address') => {
  const { rows } = await pool.query<{ address: string; content_updated_at: string }>(
    `SELECT address, content_updated_at FROM seo_snapshots
     WHERE kind = $1 AND indexable ORDER BY address LIMIT 5000`, [kind],
  );
  return rows;
}, ['seo-sitemap-v1'], { revalidate: 3600 });
