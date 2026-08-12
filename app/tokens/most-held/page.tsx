import type { Metadata } from 'next';
import RankingTable from '@/components/RankingTable';
import { fetchTopByHolders } from '@/lib/api-direct';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Most Held Tokens on Robinhood Chain — Largest Holder Count',
  description: 'ERC-20 tokens with the most unique wallet holders on Robinhood Chain. A measure of community size and token distribution.',
  alternates: { canonical: 'https://www.hood-chain.com/tokens/most-held' },
};

export default async function MostHeldPage() {
  const tokens = await fetchTopByHolders(2, 600);

  const topHolders = tokens[0]?.holders_count;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Most Held Tokens on Robinhood Chain',
    description: 'ERC-20 tokens with the most unique wallet holders on Robinhood Chain.',
    url: 'https://www.hood-chain.com/tokens/most-held',
    numberOfItems: tokens.length,
    itemListElement: tokens.slice(0, 10).map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `${t.name} (${t.symbol}) — ${t.holders_count.toLocaleString()} holders`,
      url: `https://www.hood-chain.com/token/${t.address}`,
    })),
  };

  return (
    <div className="tokens-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="tokens-seo-hero">
        <div>
          <span>Robinhood Chain · Holder Rankings</span>
          <h1>Most Held Tokens on Robinhood Chain</h1>
          <p>
            ERC-20 tokens ranked by number of unique wallet holders on Robinhood Chain.
            More holders generally indicates wider distribution and community adoption.
          </p>
        </div>
        <div className="tokens-seo-checks">
          <em>On-chain holder data</em><em>Blockscout indexed</em><em>10-min refresh</em>
        </div>
      </section>

      <div className="token-stats-grid">
        <div><span>Tokens ranked</span><strong>{tokens.length}</strong></div>
        <div>
          <span>Top holder count</span>
          <strong>{topHolders != null ? topHolders.toLocaleString() : '—'}</strong>
        </div>
        <div><span>Data source</span><strong>Blockscout</strong></div>
      </div>

      <div className="tokens-heading">
        <div>
          <h2>Widest token distribution</h2>
          <p>Ranked by unique holder addresses from Blockscout on-chain data.</p>
        </div>
      </div>

      <RankingTable
        tokens={tokens}
        cols={['price', 'change', 'holders', 'liquidity', 'volume']}
      />
    </div>
  );
}
