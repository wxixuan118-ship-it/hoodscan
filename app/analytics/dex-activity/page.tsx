import type { Metadata } from 'next';
import Link from 'next/link';
import AnalyticsNav from '@/components/AnalyticsNav';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Robinhood Chain DEX Activity | Trading Volume & On-Chain Swaps',
  description: 'Track decentralized exchange activity on Robinhood Chain including trading volume, swaps, liquidity and token pairs.',
  alternates: { canonical: 'https://www.hood-chain.com/analytics/dex-activity' },
};

type DexRow = {
  dex_id: string;
  dex_name: string;
  pool_count: number;
  total_volume_24h: number;
  total_liquidity: number;
};

async function fetchDexActivity(): Promise<DexRow[]> {
  try {
    const res = await fetch(
      'https://api.geckoterminal.com/api/v2/networks/robinhood/pools?page=1&sort=h24_volume_usd_desc',
      { headers: { accept: 'application/json' }, next: { revalidate: 600 }, signal: AbortSignal.timeout(12_000) }
    );
    if (!res.ok) return [];
    const data = await res.json() as {
      data: Array<{
        attributes: {
          volume_usd?: { h24?: string };
          reserve_in_usd?: string;
        };
        relationships?: { dex?: { data?: { id: string } } };
      }>;
    };

    const map = new Map<string, DexRow>();
    for (const pool of data.data ?? []) {
      const dexId = pool.relationships?.dex?.data?.id ?? 'unknown';
      const vol = parseFloat(pool.attributes.volume_usd?.h24 ?? '0') || 0;
      const liq = parseFloat(pool.attributes.reserve_in_usd ?? '0') || 0;
      const existing = map.get(dexId);
      if (existing) {
        existing.pool_count++;
        existing.total_volume_24h += vol;
        existing.total_liquidity += liq;
      } else {
        const dexName = dexId
          .split('-')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        map.set(dexId, { dex_id: dexId, dex_name: dexName, pool_count: 1, total_volume_24h: vol, total_liquidity: liq });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total_volume_24h - a.total_volume_24h);
  } catch {
    return [];
  }
}

function fmtUsd(v: number | null) {
  if (v === null || v === 0) return '—';
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

export default async function DexActivityPage() {
  const dexes = await fetchDexActivity();

  const totalVolume    = dexes.reduce((s, d) => s + d.total_volume_24h, 0);
  const totalLiquidity = dexes.reduce((s, d) => s + d.total_liquidity, 0);
  const totalPools     = dexes.reduce((s, d) => s + d.pool_count, 0);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Decentralized Exchange Activity on Robinhood Chain',
    description: 'All DEX protocols active on Robinhood Chain, ranked by 24h trading volume.',
    url: 'https://www.hood-chain.com/analytics/dex-activity',
    numberOfItems: dexes.length,
    itemListElement: dexes.slice(0, 10).map((d, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: d.dex_name,
      url: 'https://www.hood-chain.com/analytics/dex-activity',
    })),
  };

  return (
    <div className="tokens-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <AnalyticsNav
        current="/analytics/dex-activity"
        breadcrumbs={[{ label: 'Analytics', href: '/analytics' }, { label: 'DEX Activity' }]}
      />

      <section className="tokens-seo-hero">
        <div>
          <span>Robinhood Chain · DEX Analytics</span>
          <h1>Robinhood Chain DEX Activity</h1>
          <p>
            Monitor decentralized exchange activity across Robinhood Chain.
            View trading volume, swaps, liquidity pools and popular trading pairs.
          </p>
        </div>
        <div className="tokens-seo-checks">
          <em>GeckoTerminal data</em><em>10-min refresh</em><em>All pools</em>
        </div>
      </section>

      <div className="token-stats-grid">
        <div><span>Active DEXes</span><strong>{dexes.length}</strong></div>
        <div><span>Total 24h Volume</span><strong>{fmtUsd(totalVolume)}</strong></div>
        <div><span>Total Liquidity</span><strong>{fmtUsd(totalLiquidity)}</strong></div>
        <div><span>Total Pools</span><strong>{totalPools.toLocaleString()}</strong></div>
      </div>

      <div className="tokens-heading">
        <div>
          <h2>DEX protocols on Robinhood Chain</h2>
          <p>Ranked by 24h trading volume across all liquidity pools.</p>
        </div>
      </div>

      {dexes.length === 0 ? (
        <div className="tokens-empty">No DEX data available — retrying shortly.</div>
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
                  <th>Vol / Pool</th>
                </tr>
              </thead>
              <tbody>
                {dexes.map((dex, i) => {
                  const volPerPool = dex.pool_count ? dex.total_volume_24h / dex.pool_count : null;
                  return (
                    <tr key={dex.dex_id}>
                      <td className="rank-cell">{i + 1}</td>
                      <td>
                        <strong style={{ fontSize: '0.92rem' }}>{dex.dex_name}</strong>
                        <div style={{ fontSize: '0.72rem', opacity: 0.5, marginTop: 2 }}>{dex.dex_id}</div>
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
        <h2 style={{ fontSize: '1rem', marginBottom: 8 }}>About Robinhood Chain DEX Trading</h2>
        <p style={{ opacity: 0.7, fontSize: '0.88rem', lineHeight: 1.6, maxWidth: 640 }}>
          Robinhood Chain (Chain ID 4663) is an EVM-compatible Arbitrum L2 network. Decentralized
          exchanges use standard Uniswap V2/V3 or similar AMM contracts. Pool data is sourced
          from GeckoTerminal and refreshed every 10 minutes.
        </p>
        <div style={{ marginTop: 12, display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href="/tokens/trending" className="address-cell">Trending Tokens →</Link>
          <Link href="/tokens/most-traded" className="address-cell">Most Traded →</Link>
          <Link href="/tokens" className="address-cell">All Tokens →</Link>
        </div>
      </div>
    </div>
  );
}
