import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://hoodscan.io'));
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Per-block/tx/address/holder/transfer pages have unbounded cardinality and are
      // deliberately uncached (cache: 'no-store') — each hit is a live RPC/Blockscout
      // call. They're not in sitemap.xml either. Crawlers walking every block/tx/
      // address via internal links were driving sustained high CPU and memory
      // pressure on the container; there's no SEO value in indexing them.
      disallow: ['/block/', '/tx/', '/address/', '/token/*/holders', '/token/*/transfers'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
