import type { MetadataRoute } from 'next';
import { getSeoSitemap } from '@/lib/seo';
// Cache the two bounded DB queries at runtime; Docker builds need no database.
export const dynamic = 'force-dynamic';

const BASE = 'https://www.hood-chain.com';

const STATIC: MetadataRoute.Sitemap = [
  { url: BASE,                          changeFrequency: 'hourly',  priority: 1.0 },
  { url: `${BASE}/tokens`,              changeFrequency: 'hourly',  priority: 0.9 },
  { url: `${BASE}/tokens/trending`,     changeFrequency: 'hourly',  priority: 0.9 },
  { url: `${BASE}/tokens/new`,          changeFrequency: 'hourly',  priority: 0.8 },
  { url: `${BASE}/tokens/top-gainers`,  changeFrequency: 'hourly',  priority: 0.8 },
  { url: `${BASE}/tokens/most-traded`,  changeFrequency: 'hourly',  priority: 0.8 },
  { url: `${BASE}/tokens/most-held`,    changeFrequency: 'daily',   priority: 0.7 },
  { url: `${BASE}/analytics/dex-activity`,                 changeFrequency: 'hourly',  priority: 0.7 },
  { url: `${BASE}/blocks`,              changeFrequency: 'always',  priority: 0.6 },
  { url: `${BASE}/txs`,                 changeFrequency: 'always',  priority: 0.6 },
  { url: `${BASE}/about`,              changeFrequency: 'monthly', priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tokens, addresses] = await Promise.all([getSeoSitemap('token'), getSeoSitemap('address')]);
  return [...STATIC, ...tokens.map(t => ({ url: `${BASE}/token/${t.address}`, lastModified: new Date(t.content_updated_at) })),
    ...addresses.map(a => ({ url: `${BASE}/address/${a.address}`, lastModified: new Date(a.content_updated_at) }))];
}
