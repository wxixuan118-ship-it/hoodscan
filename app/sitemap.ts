import type { MetadataRoute } from 'next';
import { getSitemapTokens } from '@/lib/db';

const BASE = 'https://www.hood-chain.com';

const STATIC: MetadataRoute.Sitemap = [
  { url: BASE,                          changeFrequency: 'hourly',  priority: 1.0 },
  { url: `${BASE}/tokens`,              changeFrequency: 'hourly',  priority: 0.9 },
  { url: `${BASE}/tokens/trending`,     changeFrequency: 'hourly',  priority: 0.9 },
  { url: `${BASE}/tokens/new`,          changeFrequency: 'hourly',  priority: 0.8 },
  { url: `${BASE}/tokens/top-gainers`,  changeFrequency: 'hourly',  priority: 0.8 },
  { url: `${BASE}/tokens/most-traded`,  changeFrequency: 'hourly',  priority: 0.8 },
  { url: `${BASE}/tokens/most-held`,    changeFrequency: 'daily',   priority: 0.7 },
  { url: `${BASE}/dex`,                 changeFrequency: 'hourly',  priority: 0.7 },
  { url: `${BASE}/blocks`,              changeFrequency: 'always',  priority: 0.6 },
  { url: `${BASE}/txs`,                 changeFrequency: 'always',  priority: 0.6 },
  { url: `${BASE}/about`,              changeFrequency: 'monthly', priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Pull all token addresses from Postgres
  const tokens = await getSitemapTokens(5000);

  const now = new Date();

  const tokenPages: MetadataRoute.Sitemap = (tokens ?? []).map(t => ({
    url: `${BASE}/token/${t.address}`,
    lastModified: new Date(t.updated_at),
    changeFrequency: 'hourly' as const,
    // Higher-holder tokens get slightly higher priority
    priority: t.holders_count > 1000 ? 0.8 : t.holders_count > 100 ? 0.7 : 0.6,
  }));

  // Pool sub-pages for top 500 tokens (most likely to have pools)
  const poolPages: MetadataRoute.Sitemap = (tokens ?? []).slice(0, 500).map(t => ({
    url: `${BASE}/token/${t.address}/pools`,
    lastModified: new Date(t.updated_at),
    changeFrequency: 'hourly' as const,
    priority: 0.5,
  }));

  return [...STATIC, ...tokenPages, ...poolPages];
}
