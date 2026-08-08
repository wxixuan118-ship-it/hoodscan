import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTokenPools } from '@/lib/db';
import { fmtUsd, fmtPct, fmtPrice } from '@/lib/db';

export const revalidate = 300;

type Props = { params: Promise<{ address: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { address } = await params;
  return {
    title: `Liquidity Pools for ${address.slice(0, 8)}… on Robinhood Chain`,
    description: `All DEX liquidity pools for token ${address} on Robinhood Chain. Compare pool liquidity, 24h volume, and price across DEXes.`,
    alternates: { canonical: `https://www.hood-chain.com/token/${address}/pools` },
  };
}

export default async function TokenPoolsPage({ params }: Props) {
  const { address } = await params;
  const pools = await getTokenPools(address);

  if (!pools.length) notFound();

  const totalLiquidity = pools.reduce((s, p) => s + (p.liquidity_usd ?? 0), 0);
  const totalVolume    = pools.reduce((s, p) => s + (p.volume_24h ?? 0), 0);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Liquidity Pools for token ${address}`,
    url: `https://www.hood-chain.com/token/${address}/pools`,
    numberOfItems: pools.length,
    itemListElement: pools.slice(0, 10).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `${p.base_symbol ?? '?'}/${p.quote_symbol ?? '?'} on ${p.dex_name ?? 'Unknown DEX'}`,
      url: `https://www.geckoterminal.com/robinhood/pools/${p.pool_address}`,
    })),
  };

  return (
    <div className="tokens-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Breadcrumb */}
      <nav className="token-breadcrumb">
        <Link href="/">Home</Link>
        <span>›</span>
        <Link href="/tokens">Tokens</Link>
        <span>›</span>
        <Link href={`/token/${address}`}>{address.slice(0, 8)}…{address.slice(-4)}</Link>
        <span>›</span>
        <span>Pools</span>
      </nav>

      <section className="tokens-seo-hero">
        <div>
          <span>Robinhood Chain · DEX Pools</span>
          <h1>Liquidity Pools for this Token</h1>
          <p>
            All active DEX pools for{' '}
            <code style={{ fontSize: '0.85em', opacity: 0.8 }}>
              {address.slice(0, 10)}…{address.slice(-6)}
            </code>{' '}
            on Robinhood Chain, ranked by liquidity.
          </p>
        </div>
      </section>

      <div className="token-stats-grid">
        <div><span>Pools</span><strong>{pools.length}</strong></div>
        <div><span>Total liquidity</span><strong>{fmtUsd(totalLiquidity)}</strong></div>
        <div><span>Total 24h volume</span><strong>{fmtUsd(totalVolume)}</strong></div>
      </div>

      <div className="tokens-heading">
        <div>
          <h2>All pools</h2>
          <p>Sorted by liquidity depth. Click a pool address to view on GeckoTerminal.</p>
        </div>
      </div>

      <div className="tokens-table-shell">
        <div className="tokens-table-scroll">
          <table className="tokens-market-table" style={{ minWidth: 700 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Pool</th>
                <th>DEX</th>
                <th>Price</th>
                <th>24h %</th>
                <th>Liquidity</th>
                <th>24h Volume</th>
                <th>24h Txns</th>
              </tr>
            </thead>
            <tbody>
              {pools.map((pool, i) => (
                <tr key={pool.pool_address}>
                  <td className="rank-cell">{i + 1}</td>
                  <td>
                    <a
                      href={`https://www.geckoterminal.com/robinhood/pools/${pool.pool_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="address-cell"
                      style={{ fontSize: '0.78rem' }}
                    >
                      {pool.base_symbol ?? '?'}/{pool.quote_symbol ?? '?'}
                      <span style={{ opacity: 0.5, marginLeft: 6 }}>
                        {pool.pool_address.slice(0, 6)}…{pool.pool_address.slice(-4)}
                      </span>
                    </a>
                  </td>
                  <td style={{ fontSize: '0.82rem' }}>{pool.dex_name ?? '—'}</td>
                  <td className="number-cell">{fmtPrice(pool.price_usd)}</td>
                  <td className={
                    pool.price_change_24h === null ? 'muted-cell' :
                    pool.price_change_24h >= 0 ? 'positive number-cell' : 'negative number-cell'
                  }>
                    {fmtPct(pool.price_change_24h)}
                  </td>
                  <td className="muted-cell number-cell">{fmtUsd(pool.liquidity_usd)}</td>
                  <td className="muted-cell number-cell">{fmtUsd(pool.volume_24h)}</td>
                  <td className="muted-cell number-cell">
                    {pool.tx_count_24h != null ? pool.tx_count_24h.toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Link href={`/token/${address}`} className="address-cell">
          ← Back to token overview
        </Link>
      </div>
    </div>
  );
}
