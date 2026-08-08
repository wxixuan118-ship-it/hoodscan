import type { Metadata } from 'next';
import Link from 'next/link';
import { getTokens } from '@/lib/blockscout';
import { getTokenPrices } from '@/lib/price-service';
import { shortenAddress } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Robinhood Chain Tokens Explorer',
  description: 'Explore all tokens on Robinhood Chain. View token prices, holders, transfers, contracts and verified smart contracts.',
};
type Props = { searchParams: Promise<{ view?: string; search?: string }> };
export const revalidate = 30;

const compactCurrency = (value: number | null) =>
  value === null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 }).format(value);

const tokenPrice = (value: number | null) =>
  value === null ? '—' : `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: value >= 1 ? 4 : 8 })}`;

// Reputation from Blockscout: "verified" | "unknown" | ...
function VerifiedBadge({ reputation, type }: { reputation: string; type: string }) {
  const isVerified = reputation === 'verified';
  const isIdentified = type !== 'ERC-20' || reputation !== 'unknown';
  if (isVerified) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        <span className="verified-pill">✓ Contract</span>
      </div>
    );
  }
  if (isIdentified) {
    return <span style={{ color: 'var(--warning)', fontSize: '0.74rem' }}>Identified</span>;
  }
  return <span className="muted-cell">—</span>;
}

export default async function TokensPage({ searchParams }: Props) {
  const params = await searchParams;
  const view = params.view === 'market-cap' ? 'market-cap' : 'trending';
  const search = params.search?.trim().toLowerCase() || '';
  const tokens = await getTokenPrices(await getTokens());
  const rows = tokens
    .filter(token => !search || token.name.toLowerCase().includes(search) || token.symbol.toLowerCase().includes(search) || token.address.toLowerCase().includes(search))
    .sort((a, b) => view === 'market-cap' ? (b.marketCap || 0) - (a.marketCap || 0) : (b.volume24h || 0) - (a.volume24h || 0));

  const totalHolders = rows.reduce((sum, token) => sum + token.holders, 0);
  const withLiquidity = rows.filter(t => t.liquidity && t.liquidity > 0).length;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Robinhood Chain Token List',
    description: 'Explore all ERC-20 tokens on Robinhood Chain with token prices, holders, transfers, contract addresses and verified smart contract status.',
    url: '/tokens',
    keywords: ['Robinhood Chain', 'Token Explorer', 'ERC-20 tokens', 'HoodScan'],
  };

  return (
    <div className="tokens-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* SEO hero */}
      <section className="tokens-seo-hero">
        <div>
          <span>Robinhood Chain Token Explorer</span>
          <h1>Robinhood Chain Tokens</h1>
          <p>Track all ERC-20 tokens on Robinhood Chain. Live prices from GeckoTerminal, on-chain data from Blockscout.</p>
        </div>
        <div className="tokens-seo-checks">
          <em>Live prices</em><em>Holder counts</em><em>DEX liquidity</em><em>Risk signals</em><em>Verified contracts</em>
        </div>
      </section>

      {/* Stats */}
      <div className="token-stats-grid">
        <div><span>Total Tokens</span><strong>{rows.length.toLocaleString()}</strong></div>
        <div><span>Total Holders</span><strong>{totalHolders.toLocaleString()}</strong></div>
        <div><span>With Liquidity</span><strong>{withLiquidity.toLocaleString()}</strong></div>
      </div>

      {/* Heading + tabs */}
      <div className="tokens-heading">
        <div>
          <h2>Tokens</h2>
          <p>On-chain data from Blockscout · DEX prices from GeckoTerminal</p>
        </div>
        <a className="tokens-api-badge" href="https://www.geckoterminal.com/robinhood/pools" target="_blank" rel="noreferrer">{'{ }'} GeckoTerminal API</a>
      </div>
      <div className="tokens-tabs">
        <Link className={view === 'trending' ? 'active' : ''} href={`/tokens${search ? `?search=${encodeURIComponent(search)}` : ''}`}>
          Trending (24h Vol)
        </Link>
        <Link className={view === 'market-cap' ? 'active' : ''} href={`/tokens?view=market-cap${search ? `&search=${encodeURIComponent(search)}` : ''}`}>
          Market Cap
        </Link>
      </div>

      {search && <p className="tokens-results">Showing {rows.length} result{rows.length === 1 ? '' : 's'} for &ldquo;{params.search}&rdquo;</p>}

      {/* Table */}
      <div className="tokens-table-shell">
        <div className="tokens-table-scroll">
          <table className="tokens-market-table" style={{ minWidth: 860 }}>
            <thead>
              <tr>
                <th style={{ width: 36 }}>#</th>
                <th>Token</th>
                <th>Price</th>
                <th>24h</th>
                <th>24h Volume</th>
                <th>Liquidity</th>
                <th>Holders</th>
                <th>Status</th>
                <th>Contract</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((token, rank) => (
                <tr key={token.address}>
                  {/* # */}
                  <td className="rank-cell">{rank + 1}</td>

                  {/* Token: logo + name + symbol */}
                  <td>
                    <Link href={`/token/${token.address}`} className="token-identity">
                      {token.iconUrl
                        ? <img className="token-avatar" src={token.iconUrl} alt={token.symbol} width={30} height={30} />
                        : <span className="token-avatar">{token.symbol.slice(0, 2)}</span>}
                      <div>
                        <strong>{token.name}</strong>
                        <small>{token.symbol}</small>
                      </div>
                    </Link>
                  </td>

                  {/* Price */}
                  <td className="number-cell">{tokenPrice(token.price)}</td>

                  {/* 24h change */}
                  <td className={token.change24h === null ? 'muted-cell' : token.change24h >= 0 ? 'positive' : 'negative'}>
                    {token.change24h === null ? '—' : `${token.change24h >= 0 ? '+' : ''}${token.change24h.toFixed(2)}%`}
                  </td>

                  {/* 24h Volume */}
                  <td className="muted-cell number-cell">{compactCurrency(token.volume24h)}</td>

                  {/* Liquidity */}
                  <td className="muted-cell number-cell">{compactCurrency(token.liquidity)}</td>

                  {/* Holders */}
                  <td className="muted-cell number-cell">
                    {new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(token.holders)}
                  </td>

                  {/* Status */}
                  <td>
                    <VerifiedBadge reputation={token.reputation} type={token.type} />
                  </td>

                  {/* Contract */}
                  <td>
                    <Link href={`/token/${token.address}`} className="address-cell">
                      {shortenAddress(token.address, 6)}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <div className="tokens-empty">No tokens match your search.</div>}
        </div>
      </div>

      <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--muted)' }}>
        <strong style={{ color: 'var(--foreground)' }}>Status legend:</strong>{' '}
        <span style={{ color: 'var(--success)' }}>✓ Contract</span> = source code verified on Blockscout ·{' '}
        <span style={{ color: 'var(--warning)' }}>Identified</span> = token metadata confirmed ·{' '}
        <span style={{ color: 'var(--muted)' }}>—</span> = unverified
      </p>
    </div>
  );
}
