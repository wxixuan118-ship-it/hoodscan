import type { Metadata } from 'next';
import Link from 'next/link';
import AnalyticsNav from '@/components/AnalyticsNav';
import { fetchFromGtPools, fetchTopByHolders } from '@/lib/api-direct';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Robinhood Chain Token Analytics | Holder Distribution & Token Activity',
  description: 'Explore Robinhood Chain token analytics including holder distribution, token transfers, new token deployments and whale wallet activity.',
  alternates: { canonical: 'https://www.hood-chain.com/analytics/token' },
};

const TOKEN_LINKS = [
  { href: '/tokens',              label: 'All Tokens',    desc: 'Complete ERC-20 token list with prices and contracts' },
  { href: '/tokens/trending',     label: 'Trending',      desc: 'Most active tokens by DEX trading activity' },
  { href: '/tokens/new',          label: 'New Tokens',    desc: 'Recently deployed token contracts' },
  { href: '/tokens/most-held',    label: 'Most Held',     desc: 'Tokens with the most unique wallet holders' },
  { href: '/tokens/most-traded',  label: 'Most Traded',   desc: 'Highest 24h DEX volume' },
  { href: '/tokens/top-gainers',  label: 'Top Gainers',   desc: 'Biggest price increases in 24 hours' },
];

export default async function TokenAnalyticsPage() {
  const [trendingTokens, topHeld] = await Promise.all([
    fetchFromGtPools('trending_pools', 'rank_trending', 300).catch(() => []),
    fetchTopByHolders(1, 300).catch(() => []),
  ]);

  const totalHolders = topHeld.reduce((s, t) => s + t.holders_count, 0);
  const topHolderToken = topHeld[0];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Robinhood Chain Token Analytics',
    url: 'https://www.hood-chain.com/analytics/token',
    description: 'Token holder distribution, activity and analytics for Robinhood Chain ERC-20 tokens.',
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <AnalyticsNav
        current="/analytics/token"
        breadcrumbs={[{ label: 'Analytics', href: '/analytics' }, { label: 'Token Analytics' }]}
      />

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.5px' }}>
          Robinhood Chain Token Analytics
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.925rem', margin: '0 0 0.25rem', lineHeight: 1.6 }}>
          Explore token holder distribution, activity and on-chain data for Robinhood Chain ERC-20 tokens.
        </p>
        <p style={{ color: 'var(--muted)', fontSize: '0.925rem', margin: 0, lineHeight: 1.6 }}>
          Track new token deployments, whale movements and token adoption across Robinhood Chain.
        </p>
      </div>

      {/* Stats overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Trending Tokens', value: trendingTokens.length.toString(), sub: 'active DEX pools' },
          { label: 'Tokens Indexed', value: topHeld.length.toString(), sub: 'by holder count' },
          { label: 'Top Holder Count', value: topHolderToken ? topHolderToken.holders_count.toLocaleString() : '—', sub: topHolderToken?.symbol ?? '' },
          { label: 'Combined Holders', value: totalHolders > 0 ? totalHolders.toLocaleString() : '—', sub: 'across top tokens' },
        ].map(({ label, value, sub }) => (
          <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem 1.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.5px' }}>{value}</div>
            {sub && <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* Token sections */}
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1rem' }}>Token Explorer Sections</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {TOKEN_LINKS.map(link => (
          <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
              padding: '1.25rem 1.5rem',
            }}>
              <strong style={{ fontSize: '0.95rem', color: 'var(--foreground)', display: 'block', marginBottom: '0.4rem' }}>
                {link.label}
              </strong>
              <p style={{ color: 'var(--muted)', fontSize: '0.82rem', margin: '0 0 0.75rem', lineHeight: 1.5 }}>{link.desc}</p>
              <span style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 600 }}>View →</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Trending now */}
      {trendingTokens.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: '2rem' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Trending Tokens Now</h2>
            <Link href="/tokens/trending" style={{ color: 'var(--primary)', fontSize: '0.82rem' }}>View all →</Link>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr>
                  {['#', 'Token', 'Price', '24h Change', 'Volume', 'Holders'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1.25rem', textAlign: 'left', color: 'var(--muted)', fontWeight: 500, fontSize: '0.78rem', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trendingTokens.slice(0, 10).map((token, i) => (
                  <tr key={token.address} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem 1.25rem', color: 'var(--muted)', fontWeight: 600, width: 36 }}>{i + 1}</td>
                    <td style={{ padding: '0.75rem 1.25rem' }}>
                      <Link href={`/token/${token.address}`} style={{ textDecoration: 'none' }}>
                        <strong style={{ color: 'var(--foreground)' }}>{token.name}</strong>
                        <span style={{ color: 'var(--muted)', fontSize: '0.78rem', marginLeft: 6 }}>{token.symbol}</span>
                      </Link>
                    </td>
                    <td style={{ padding: '0.75rem 1.25rem', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                      {token.price_usd != null ? `$${token.price_usd.toFixed(token.price_usd >= 1 ? 4 : 8)}` : '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1.25rem', color: token.price_change_24h == null ? 'var(--muted)' : token.price_change_24h >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {token.price_change_24h != null ? `${token.price_change_24h >= 0 ? '+' : ''}${token.price_change_24h.toFixed(2)}%` : '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1.25rem', color: 'var(--muted)' }}>
                      {token.volume_24h != null ? `$${token.volume_24h >= 1_000_000 ? (token.volume_24h / 1_000_000).toFixed(1) + 'M' : (token.volume_24h / 1000).toFixed(0) + 'K'}` : '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1.25rem', color: 'var(--muted)' }}>
                      {token.holders_count > 0 ? token.holders_count.toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
        Token data from GeckoTerminal and Blockscout · holder counts from on-chain indexing · updated every 5 minutes
      </div>
    </div>
  );
}
