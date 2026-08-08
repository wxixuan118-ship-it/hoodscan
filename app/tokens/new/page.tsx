import type { Metadata } from 'next';
import RankingTable from '@/components/RankingTable';
import { getNewTokens } from '@/lib/db';

export const revalidate = 600; // 10 minutes

export const metadata: Metadata = {
  title: 'New Tokens on Robinhood Chain',
  description: 'Recently launched ERC-20 tokens on Robinhood Chain. Track new token deployments, early liquidity, and holder growth.',
  alternates: { canonical: 'https://www.hood-chain.com/tokens/new' },
};

export default async function NewTokensPage() {
  const tokens = await getNewTokens(100);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'New Tokens on Robinhood Chain',
    description: 'Recently launched ERC-20 tokens on Robinhood Chain in the past 14 days.',
    url: 'https://www.hood-chain.com/tokens/new',
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
          <span>Robinhood Chain · New Listings</span>
          <h1>New Tokens on Robinhood Chain</h1>
          <p>
            ERC-20 tokens launched on Robinhood Chain in the past 14 days.
            Sorted by listing date, newest first.
          </p>
        </div>
        <div className="tokens-seo-checks">
          <em>Last 14 days</em><em>DEX pools tracked</em><em>Risk signals</em>
        </div>
      </section>

      <div className="token-stats-grid">
        <div><span>New Tokens (14d)</span><strong>{tokens.length}</strong></div>
        <div><span>Data source</span><strong>Blockscout + GT</strong></div>
        <div><span>Refresh</span><strong>Every 10 min</strong></div>
      </div>

      <div className="tokens-heading">
        <div>
          <h2>Recently listed</h2>
          <p>Tokens detected via new GeckoTerminal pool creation in the past 14 days.</p>
        </div>
      </div>

      <RankingTable
        tokens={tokens}
        cols={['price', 'change', 'liquidity', 'holders', 'first_seen']}
        emptyMessage="No new tokens found in the past 14 days — check back after the next sync."
      />
    </div>
  );
}
