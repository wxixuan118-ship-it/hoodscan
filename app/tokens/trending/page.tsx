import type { Metadata } from 'next';
import RankingTable from '@/components/RankingTable';
import { getTrendingTokens } from '@/lib/db';

export const revalidate = 300; // 5 minutes

export const metadata: Metadata = {
  title: 'Trending Tokens on Robinhood Chain',
  description: 'Discover the most actively traded tokens on Robinhood Chain right now. Ranked by 24-hour trading volume and DEX activity from GeckoTerminal.',
  alternates: { canonical: 'https://www.hood-chain.com/tokens/trending' },
};

export default async function TrendingPage() {
  const tokens = await getTrendingTokens(100);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Trending Tokens on Robinhood Chain',
    description: 'Top trending ERC-20 tokens on Robinhood Chain by DEX trading activity.',
    url: 'https://www.hood-chain.com/tokens/trending',
    numberOfItems: tokens.length,
    itemListElement: tokens.slice(0, 10).map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `${t.name} (${t.symbol})`,
      url: `https://www.hood-chain.com/token/${t.address}`,
    })),
  };

  return (
    <div className="tokens-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="tokens-seo-hero">
        <div>
          <span>Robinhood Chain · Live Rankings</span>
          <h1>Trending Tokens on Robinhood Chain</h1>
          <p>
            Tokens ranked by real-time DEX trading activity on Robinhood Chain.
            Updated every 5 minutes from GeckoTerminal pool data.
          </p>
        </div>
        <div className="tokens-seo-checks">
          <em>GeckoTerminal data</em><em>5-min refresh</em><em>DEX volume</em>
        </div>
      </section>

      <div className="token-stats-grid">
        <div><span>Trending Tokens</span><strong>{tokens.length}</strong></div>
        <div><span>Data source</span><strong>GeckoTerminal</strong></div>
        <div><span>Refresh</span><strong>Every 5 min</strong></div>
      </div>

      <div className="tokens-heading">
        <div>
          <h2>Trending now</h2>
          <p>Ordered by GeckoTerminal trending score — pools with the most recent activity rank highest.</p>
        </div>
      </div>

      <RankingTable
        tokens={tokens}
        cols={['price', 'change', 'volume', 'liquidity', 'holders']}
      />
    </div>
  );
}
