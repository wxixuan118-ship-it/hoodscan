import type { Metadata } from 'next';
import RankingTable from '@/components/RankingTable';
import TokenNav from '@/components/TokenNav';
import { getRanking } from '@/lib/token-rankings';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Trending Robinhood Chain Tokens | Popular Tokens Explorer',
  description: 'Discover trending tokens on Robinhood Chain based on holder growth, trading activity and on-chain data.',
  alternates: { canonical: 'https://www.hood-chain.com/tokens/trending' },
};

export default async function TrendingPage() {
  const tokens = await getRanking('trending', 50, 300);

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
          <h1>Trending Robinhood Chain Tokens</h1>
          <p>
            Discover the most popular tokens on Robinhood Chain by holder growth and on-chain activity.
            Rankings updated every 5 minutes from live DEX data.
          </p>
        </div>
        <div className="tokens-seo-checks">
          <em>GeckoTerminal data</em><em>5-min refresh</em><em>DEX volume</em>
        </div>
      </section>

      <TokenNav current="/tokens/trending" />

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
