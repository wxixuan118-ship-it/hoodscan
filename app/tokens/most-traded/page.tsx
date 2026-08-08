import type { Metadata } from 'next';
import RankingTable from '@/components/RankingTable';
import { getMostTraded } from '@/lib/db';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Most Traded Tokens on Robinhood Chain — Highest 24h Volume',
  description: 'ERC-20 tokens with the highest 24-hour trading volume on Robinhood Chain DEXes. Updated every 5 minutes.',
  alternates: { canonical: 'https://www.hood-chain.com/tokens/most-traded' },
};

export default async function MostTradedPage() {
  const tokens = await getMostTraded(100);

  const topVolume = tokens[0]?.volume_24h;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Most Traded Tokens on Robinhood Chain',
    description: 'ERC-20 tokens with the highest 24-hour DEX trading volume on Robinhood Chain.',
    url: 'https://www.hood-chain.com/tokens/most-traded',
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
          <span>Robinhood Chain · Volume Rankings</span>
          <h1>Most Traded Tokens on Robinhood Chain</h1>
          <p>
            ERC-20 tokens ranked by 24-hour DEX trading volume on Robinhood Chain.
            High volume signals active price discovery and liquidity depth.
          </p>
        </div>
        <div className="tokens-seo-checks">
          <em>DEX volume</em><em>5-min refresh</em><em>All pools aggregated</em>
        </div>
      </section>

      <div className="token-stats-grid">
        <div><span>Tokens ranked</span><strong>{tokens.length}</strong></div>
        <div>
          <span>Top 24h volume</span>
          <strong>
            {topVolume != null
              ? `$${topVolume >= 1_000_000 ? (topVolume / 1_000_000).toFixed(1) + 'M' : (topVolume / 1000).toFixed(0) + 'K'}`
              : '—'}
          </strong>
        </div>
        <div><span>Data source</span><strong>GeckoTerminal</strong></div>
      </div>

      <div className="tokens-heading">
        <div>
          <h2>Highest 24h volume</h2>
          <p>Sorted by total DEX trading volume across all pools in the past 24 hours.</p>
        </div>
      </div>

      <RankingTable
        tokens={tokens}
        cols={['price', 'change', 'volume', 'liquidity', 'holders']}
      />
    </div>
  );
}
