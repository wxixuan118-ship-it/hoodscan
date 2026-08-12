import type { Metadata } from 'next';
import RankingTable from '@/components/RankingTable';
import { fetchTopGainers } from '@/lib/api-direct';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Top Gainers on Robinhood Chain — Biggest 24h Price Increases',
  description: 'Tokens with the biggest 24-hour price gains on Robinhood Chain DEXes. Updated every 5 minutes from live pool data.',
  alternates: { canonical: 'https://www.hood-chain.com/tokens/top-gainers' },
};

export default async function TopGainersPage() {
  const tokens = await fetchTopGainers(300);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Top Gaining Tokens on Robinhood Chain',
    description: 'ERC-20 tokens with the highest 24-hour price increase on Robinhood Chain.',
    url: 'https://www.hood-chain.com/tokens/top-gainers',
    numberOfItems: tokens.length,
    itemListElement: tokens.slice(0, 10).map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `${t.name} (${t.symbol}) +${t.price_change_24h?.toFixed(2) ?? '?'}%`,
      url: `https://www.hood-chain.com/token/${t.address}`,
    })),
  };

  return (
    <div className="tokens-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="tokens-seo-hero">
        <div>
          <span>Robinhood Chain · 24h Leaders</span>
          <h1>Top Gainers on Robinhood Chain</h1>
          <p>
            Tokens with the largest 24-hour price increase on Robinhood Chain DEXes.
            Ranked by % change across all active liquidity pools.
          </p>
        </div>
        <div className="tokens-seo-checks">
          <em>Live pool prices</em><em>5-min refresh</em><em>Verified DEX data</em>
        </div>
      </section>

      <div className="token-stats-grid">
        <div><span>Gainers tracked</span><strong>{tokens.length}</strong></div>
        <div>
          <span>Top gain (24h)</span>
          <strong>
            {tokens[0]?.price_change_24h != null
              ? `+${tokens[0].price_change_24h.toFixed(2)}%`
              : '—'}
          </strong>
        </div>
        <div><span>Data source</span><strong>GeckoTerminal</strong></div>
      </div>

      <div className="tokens-heading">
        <div>
          <h2>Biggest 24h gainers</h2>
          <p>Ranked by 24h price change % from GeckoTerminal pool data. Higher risk — always verify liquidity.</p>
        </div>
      </div>

      <RankingTable
        tokens={tokens}
        cols={['price', 'change', 'volume', 'liquidity', 'holders']}
      />
    </div>
  );
}
