import type { Metadata } from 'next';
import Link from 'next/link';
import { getDexes } from '@/lib/db';
import { fmtUsd } from '@/lib/db';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'DEX Activity on Robinhood Chain — Decentralized Exchange Overview',
  description: 'All decentralized exchanges (DEXes) on Robinhood Chain. Compare trading volume, liquidity, and pool count across protocols.',
  alternates: { canonical: 'https://www.hood-chain.com/dex' },
};

export default async function DexPage() {
  const dexes = await getDexes();

  const totalVolume    = dexes.reduce((s, d) => s + (d.total_volume_24h ?? 0), 0);
  const totalLiquidity = dexes.reduce((s, d) => s + (d.total_liquidity ?? 0), 0);
  const totalPools     = dexes.reduce((s, d) => s + d.pool_count, 0);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Decentralized Exchanges on Robinhood Chain',
    description: 'All DEX protocols active on Robinhood Chain, ranked by 24h trading volume.',
    url: 'https://www.hood-chain.com/dex',
    numberOfItems: dexes.length,
    itemListElement: dexes.slice(0, 10).map((d, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: d.dex_name,
      url: `https://www.hood-chain.com/dex`,
    })),
  };

  return (
    <div className="tokens-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="tokens-seo-hero">
        <div>
          <span>Robinhood Chain · DEX Activity</span>
          <h1>Decentralized Exchange Overview</h1>
          <p>
            All DEX protocols active on Robinhood Chain (Chain ID 4663). Rankings by 24-hour trading
            volume aggregated from GeckoTerminal pool data.
          </p>
        </div>
        <div className="tokens-seo-checks">
          <em>GeckoTerminal data</em><em>10-min refresh</em><em>All pools</em>
        </div>
      </section>

      <div className="token-stats-grid">
        <div><span>Active DEXes</span><strong>{dexes.length}</strong></div>
        <div><span>Total 24h volume</span><strong>{fmtUsd(totalVolume)}</strong></div>
        <div><span>Total liquidity</span><strong>{fmtUsd(totalLiquidity)}</strong></div>
        <div><span>Total pools</span><strong>{totalPools.toLocaleString()}</strong></div>
      </div>

      <div className="tokens-heading">
        <div>
          <h2>DEX protocols</h2>
          <p>Sorted by 24h trading volume across all pools on each protocol.</p>
        </div>
      </div>

      {dexes.length === 0 ? (
        <div className="tokens-empty">
          No DEX data yet — sync is running. Check back in a few minutes.
        </div>
      ) : (
        <div className="tokens-table-shell">
          <div className="tokens-table-scroll">
            <table className="tokens-market-table" style={{ minWidth: 600 }}>
              <thead>
                <tr>
                  <th style={{ width: 36 }}>#</th>
                  <th>Protocol</th>
                  <th>24h Volume</th>
                  <th>Total Liquidity</th>
                  <th>Pools</th>
                  <th>Vol/Pool</th>
                </tr>
              </thead>
              <tbody>
                {dexes.map((dex, i) => {
                  const volPerPool = dex.total_volume_24h && dex.pool_count
                    ? dex.total_volume_24h / dex.pool_count
                    : null;
                  return (
                    <tr key={dex.dex_id}>
                      <td className="rank-cell">{i + 1}</td>
                      <td>
                        <strong style={{ fontSize: '0.92rem' }}>{dex.dex_name}</strong>
                        <div style={{ fontSize: '0.72rem', opacity: 0.5, marginTop: 2 }}>
                          {dex.dex_id}
                        </div>
                      </td>
                      <td className="number-cell">{fmtUsd(dex.total_volume_24h)}</td>
                      <td className="muted-cell number-cell">{fmtUsd(dex.total_liquidity)}</td>
                      <td className="muted-cell number-cell">{dex.pool_count.toLocaleString()}</td>
                      <td className="muted-cell number-cell">{fmtUsd(volPerPool)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: '1rem', marginBottom: 8 }}>About Robinhood Chain DEXes</h2>
        <p style={{ opacity: 0.7, fontSize: '0.88rem', lineHeight: 1.6, maxWidth: 640 }}>
          Robinhood Chain (Chain ID 4663) is an EVM-compatible Arbitrum L2 network. Decentralized
          exchanges on the chain use standard Uniswap V2/V3 or similar AMM contracts. Pool data
          is sourced from GeckoTerminal and refreshed every 10 minutes.
        </p>
        <div style={{ marginTop: 12 }}>
          <Link href="/tokens/trending" className="address-cell" style={{ marginRight: 16 }}>
            Trending Tokens →
          </Link>
          <Link href="/tokens" className="address-cell">
            All Tokens →
          </Link>
        </div>
      </div>
    </div>
  );
}
