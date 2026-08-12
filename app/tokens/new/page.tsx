import type { Metadata } from 'next';
import RankingTable from '@/components/RankingTable';
import TokenNav from '@/components/TokenNav';
import { fetchFromGtPools } from '@/lib/api-direct';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'New Robinhood Chain Tokens | Recently Created Tokens Explorer',
  description: 'Discover newly created tokens on Robinhood Chain. Track new contracts, token holders and first blockchain activity.',
  alternates: { canonical: 'https://www.hood-chain.com/tokens/new' },
};

export default async function NewTokensPage() {
  const tokens = (await fetchFromGtPools('new_pools', 'rank_trending', 600))
    .map(t => ({ ...t, is_new: true }));

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
          <h1>New Robinhood Chain Tokens</h1>
          <p>
            Recently created ERC-20 tokens on Robinhood Chain. Track new contract deployments,
            first blockchain activity, and early holder growth.
          </p>
        </div>
        <div className="tokens-seo-checks">
          <em>New pool detection</em><em>DEX pools tracked</em><em>Risk signals</em>
        </div>
      </section>

      <TokenNav current="/tokens/new" />

      <div className="token-stats-grid">
        <div><span>New Tokens</span><strong>{tokens.length}</strong></div>
        <div><span>Data source</span><strong>GeckoTerminal</strong></div>
        <div><span>Refresh</span><strong>Every 10 min</strong></div>
      </div>

      <div className="tokens-heading">
        <div>
          <h2>Recently listed</h2>
          <p>Tokens detected via new GeckoTerminal pool creation — newest pools first.</p>
        </div>
      </div>

      <RankingTable
        tokens={tokens}
        cols={['price', 'change', 'liquidity', 'holders', 'first_seen']}
        emptyMessage="No new pools found — check back shortly."
      />
    </div>
  );
}
