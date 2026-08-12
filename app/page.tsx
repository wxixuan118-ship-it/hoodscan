import type { Metadata } from 'next';
import Link from 'next/link';
import { getLatestBlocks, getNetworkSnapshot } from '@/lib/robinhood-rpc';
import { getIndexStats, getTokens, getTransactions } from '@/lib/blockscout';
import { getTokenPrices } from '@/lib/price-service';
import { timeAgo, formatNumber } from '@/lib/utils';

export const revalidate = 12;

export const metadata: Metadata = {
  title: 'Robinhood Chain Explorer | HoodScan Mainnet Block Explorer',
  description: 'HoodScan is a Robinhood Chain explorer for tracking blocks, transactions, tokens, wallet addresses, verified contracts and on-chain analytics.',
  alternates: { canonical: 'https://www.hood-chain.com' },
  openGraph: {
    title: 'Robinhood Chain Explorer | HoodScan Mainnet Block Explorer',
    description: 'HoodScan is a Robinhood Chain explorer for tracking blocks, transactions, tokens, wallet addresses, verified contracts and on-chain analytics.',
    url: 'https://www.hood-chain.com',
    type: 'website',
  },
};

// ── Shared style constants ────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '1.25rem 1.5rem',
};

const sectionTitle: React.CSSProperties = {
  fontSize: '1.2rem',
  fontWeight: 800,
  margin: '0 0 0.375rem',
  letterSpacing: '-0.3px',
};

const sectionSub: React.CSSProperties = {
  color: 'var(--muted)',
  fontSize: '0.875rem',
  margin: '0 0 1.25rem',
  lineHeight: 1.6,
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title, sub, linkHref, linkLabel }: { title: string; sub?: string; linkHref?: string; linkLabel?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
      <div>
        <h2 style={sectionTitle}>{title}</h2>
        {sub && <p style={sectionSub}>{sub}</p>}
      </div>
      {linkHref && (
        <Link href={linkHref} style={{ color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 500, whiteSpace: 'nowrap', marginTop: 4 }}>
          {linkLabel ?? 'View all →'}
        </Link>
      )}
    </div>
  );
}

function NavCard({ href, title, desc, external }: { href: string; title: string; desc: string; external?: boolean }) {
  const inner = (
    <div style={{ ...card, cursor: 'pointer', height: '100%', boxSizing: 'border-box' }}>
      <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--foreground)', marginBottom: '0.4rem' }}>{title}</strong>
      <p style={{ color: 'var(--muted)', fontSize: '0.82rem', margin: '0 0 0.875rem', lineHeight: 1.5 }}>{desc}</p>
      <span style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 600 }}>
        {external ? 'Open ↗' : 'Explore →'}
      </span>
    </div>
  );
  return external
    ? <a href={href} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>{inner}</a>
    : <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link>;
}

const GRID4: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: '1rem',
};

// ── JSON-LD ───────────────────────────────────────────────────────────────────

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'HoodScan — Robinhood Chain Explorer',
  url: 'https://www.hood-chain.com',
  description: 'HoodScan is a blockchain explorer for Robinhood Chain mainnet. Search blocks, transactions, tokens, wallet addresses and smart contracts.',
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: 'https://www.hood-chain.com/tokens?search={search_term_string}' },
    'query-input': 'required name=search_term_string',
  },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [rpcStats, indexStats, latestBlocks, latestTxs, popularTokens] = await Promise.all([
    getNetworkSnapshot().catch(() => null),
    getIndexStats().catch(() => null),
    getLatestBlocks(6).then(b => [...b].sort((a, b) => b.number - a.number)).catch(() => []),
    getTransactions().catch(() => []),
    getTokens().then(tokens => getTokenPrices(tokens)).catch(() => []),
  ]);

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '2.25rem 1.5rem 4rem' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ── Section 1: Hero ────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
          Robinhood Chain Explorer
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '1.05rem', margin: '0 auto 1.5rem', maxWidth: 620, lineHeight: 1.65 }}>
          HoodScan is a blockchain explorer for Robinhood Chain mainnet. Search transactions, blocks, wallet addresses, tokens and smart contracts with real-time on-chain data.
        </p>
        {/* Trust badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem' }}>
          {[
            { dot: true, label: 'Robinhood Chain Mainnet' },
            { dot: false, label: 'Blockscout Indexed' },
            { dot: false, label: 'Real-time On-chain Data' },
          ].map(({ dot, label }) => (
            <span key={label} style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              fontSize: '0.78rem', fontWeight: 500, color: 'var(--muted)',
              padding: '0.3rem 0.85rem', borderRadius: 20,
              border: '1px solid var(--border)', background: 'var(--surface)',
            }}>
              {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />}
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Section 2: Network Overview ────────────────────────────────── */}
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '0.875rem' }}>
          {[
            { label: 'Chain ID',            value: '4663' },
            { label: 'Latest Block',        value: rpcStats?.blockHeight.toLocaleString() ?? indexStats?.totalBlocks.toLocaleString() ?? '—' },
            { label: 'Total Transactions',  value: indexStats ? formatNumber(indexStats.totalTransactions) : '—' },
            { label: 'Active Addresses',    value: indexStats ? formatNumber(indexStats.totalAddresses) : '—' },
            { label: 'Gas Price',           value: rpcStats?.gasPrice ?? indexStats?.gasPrice ?? '—' },
            { label: '24h TPS',             value: indexStats?.tps ?? '—' },
          ].map(({ label, value }) => (
            <div key={label} className="live-stat-card" style={{ ...card, padding: '1rem 1.25rem' }}>
              <p style={{ color: 'var(--muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.45rem' }}>{label}</p>
              <p className="live-number" style={{ fontWeight: 700, fontSize: '1.15rem', margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'right' }}>
          <Link href="/analytics/network-stats" style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 500 }}>
            View Network Statistics →
          </Link>
        </div>
      </div>

      {/* ── Section 3: Live Feeds (Blocks + Transactions) ──────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>

        {/* Latest Blocks */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}><span className="live-dot" />Latest Blocks</h2>
            <Link href="/blocks" style={{ fontSize: '0.8rem' }}>View all →</Link>
          </div>
          <div className="live-scroll-window">
            <div className="live-scroll-track">
              {[...latestBlocks, ...latestBlocks].map((block, index) => (
                <div key={`${block.number}-${index}`} className="live-feed-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <Link href={`/block/${block.number}`} style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      #{block.number.toLocaleString()}
                    </Link>
                    <p style={{ color: 'var(--muted)', fontSize: '0.75rem', margin: '0.2rem 0 0' }}>{timeAgo(block.timestamp)}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.85rem', margin: 0 }}>{block.txCount} txns</p>
                    <p style={{ color: 'var(--muted)', fontSize: '0.75rem', margin: '0.2rem 0 0' }}>Gas: {(Number(block.gasUsed) / 1_000_000).toFixed(2)}M</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {latestBlocks.length === 0 && <p style={{ color: 'var(--muted)', padding: '1.5rem', fontSize: '.82rem' }}>Live block data is temporarily unavailable.</p>}
        </div>

        {/* Latest Transactions */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}><span className="live-dot" />Latest Transactions</h2>
            <Link href="/txs" style={{ fontSize: '0.8rem' }}>View all →</Link>
          </div>
          <div className="live-scroll-window">
            <div className="live-scroll-track reverse">
              {[...latestTxs.slice(0, 8), ...latestTxs.slice(0, 8)].map((tx, index) => (
                <div key={`${tx.hash}-${index}`} className="live-feed-row" style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem' }}>
                    <div>
                      <Link href={`/tx/${tx.hash}`} style={{ fontSize: '.84rem', fontFamily: 'monospace' }}>{tx.hash.slice(0, 12)}...{tx.hash.slice(-6)}</Link>
                      <p style={{ color: 'var(--muted)', fontSize: '.75rem', margin: '.2rem 0 0' }}>{timeAgo(tx.timestamp)}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ color: tx.status === 'success' ? 'var(--success)' : 'var(--danger)', fontSize: '.75rem' }}>{tx.status}</span>
                      <p style={{ margin: '.2rem 0 0', fontSize: '.8rem' }}>{tx.value} ETH</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {latestTxs.length === 0 && <p style={{ color: 'var(--muted)', padding: '1.5rem', fontSize: '.82rem' }}>Indexed transactions are temporarily unavailable.</p>}
        </div>
      </div>

      {/* ── Section 4: Explorer Overview ───────────────────────────────── */}
      <div style={{ marginBottom: '3rem' }}>
        <SectionHeader title="Explore Robinhood Chain" sub="Browse blocks, transactions, wallet addresses and verified smart contracts on Robinhood Chain mainnet." />
        <div style={GRID4}>
          <NavCard href="/blocks"     title="Blocks"             desc="Explore latest Robinhood Chain blocks, block height, timestamps and transaction activity." />
          <NavCard href="/txs"        title="Transactions"       desc="Track Robinhood Chain transactions, wallet transfers and contract interactions." />
          <NavCard href="/contracts"  title="Verified Contracts" desc="Browse verified smart contracts deployed on Robinhood Chain with source code and ABI." />
          <NavCard href="/analytics/top-accounts" title="Top Addresses" desc="Search Robinhood Chain wallet addresses, balances and on-chain activity." />
        </div>
      </div>

      {/* ── Section 5: Token Explorer ──────────────────────────────────── */}
      <div style={{ marginBottom: '3rem' }}>
        <SectionHeader
          title="Robinhood Chain Token Explorer"
          sub="Explore tokens deployed on Robinhood Chain including holders, transfers, trading activity and contract information."
          linkHref="/tokens"
          linkLabel="All Tokens →"
        />
        <div style={{ ...GRID4, marginBottom: '1.5rem' }}>
          <NavCard href="/tokens"             title="All Tokens"      desc="Complete ERC-20 token list with live prices and contract addresses." />
          <NavCard href="/tokens/most-held"   title="Most Held"       desc="Tokens with the most unique wallet holders on Robinhood Chain." />
          <NavCard href="/tokens/trending"    title="Trending Tokens" desc="Most active tokens by DEX trading activity, updated every 5 minutes." />
          <NavCard href="/tokens/new"         title="New Tokens"      desc="Recently deployed token contracts on Robinhood Chain." />
          <NavCard href="/tokens/most-traded" title="Most Traded"     desc="Tokens with the highest 24-hour DEX trading volume." />
          <NavCard href="/tokens/top-gainers" title="Top Gainers"     desc="Tokens with the biggest price increases in the past 24 hours." />
        </div>

        {/* Popular Tokens table */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Popular Tokens on Robinhood Chain</span>
            <Link href="/tokens" style={{ fontSize: '0.8rem' }}>View all →</Link>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Token', 'Symbol', 'Holders', '24h Volume', 'Price'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1.5rem', textAlign: 'left', color: 'var(--muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {popularTokens.map(token => (
                  <tr key={token.address} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.875rem 1.5rem' }}>
                      <Link href={`/token/${token.address}`} style={{ fontWeight: 600 }}>{token.name}</Link>
                    </td>
                    <td style={{ padding: '0.875rem 1.5rem' }}>
                      <span style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 4, padding: '0.2rem 0.5rem', fontSize: '0.8rem', fontWeight: 600 }}>
                        {token.symbol}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1.5rem', color: 'var(--muted)' }}>{token.holders.toLocaleString()}</td>
                    <td style={{ padding: '0.875rem 1.5rem', color: 'var(--muted)' }}>{token.volume24h === null ? '—' : formatNumber(token.volume24h)}</td>
                    <td style={{ padding: '0.875rem 1.5rem' }}>{token.price === null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumSignificantDigits: 4 }).format(token.price)}</td>
                  </tr>
                ))}
                {popularTokens.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '1.5rem', color: 'var(--muted)', textAlign: 'center' }}>Live token data is temporarily unavailable.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Section 6: Analytics ───────────────────────────────────────── */}
      <div style={{ marginBottom: '3rem' }}>
        <SectionHeader
          title="Robinhood Chain Analytics"
          sub="Real-time on-chain data and network analytics for Robinhood Chain mainnet."
          linkHref="/analytics"
          linkLabel="All Analytics →"
        />
        <div style={GRID4}>
          <NavCard href="/analytics/network-stats" title="Network Stats"  desc="Block height, transactions, active wallets, TPS and gas usage." />
          <NavCard href="/analytics/gas-tracker"   title="Gas Tracker"   desc="Current gas prices with slow, standard and fast fee tiers." />
          <NavCard href="/analytics/top-accounts"  title="Top Accounts"  desc="Largest wallet addresses ranked by ETH balance." />
          <NavCard href="/analytics/dex-activity"  title="DEX Activity"  desc="Decentralized exchange volume, swaps and liquidity pools." />
        </div>
      </div>

      {/* ── Section 7: Developer Resources ────────────────────────────── */}
      <div style={{ marginBottom: '3rem' }}>
        <SectionHeader title="Developer Resources" sub="Tools and documentation for building on Robinhood Chain." />
        <div style={GRID4}>
          <NavCard href="https://docs.robinhood.com/chain/"                    title="RPC & Docs"        desc="Robinhood Chain RPC endpoint, chain configuration and developer documentation." external />
          <NavCard href="https://github.com/robinhood-chain"                   title="GitHub"            desc="Open-source smart contracts, SDKs and tooling for Robinhood Chain." external />
          <NavCard href="https://docs.robinhood.com/"                          title="Bridge"            desc="Bridge assets to and from Robinhood Chain with official bridge documentation." external />
          <NavCard href="https://docs.robinhood.com/chain/add-network-to-wallet/" title="Mainnet Info"  desc="Add Robinhood Chain to your wallet. Chain ID 4663, EVM-compatible L2." external />
        </div>
      </div>

      {/* ── Section 8: SEO Content Footer ─────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2.5rem', marginTop: '1rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 1.25rem', letterSpacing: '-0.3px' }}>
          About HoodScan — Robinhood Chain Explorer
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
          <div>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 1.75, margin: '0 0 1rem' }}>
              HoodScan is a blockchain explorer built for Robinhood Chain mainnet. Robinhood Chain (Chain ID 4663) is an Arbitrum-based Layer 2 network that delivers fast, low-cost Ethereum-compatible transactions. HoodScan provides free, real-time access to all on-chain data — blocks, transactions, wallet addresses, token contracts and verified smart contract source code.
            </p>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 1.75, margin: 0 }}>
              As a Robinhood Chain block explorer, HoodScan indexes and presents blockchain data in a format accessible to developers, traders, and anyone interacting with the network. Whether you are verifying a transaction, checking a wallet balance, or auditing a smart contract, HoodScan provides the transparency that on-chain activity requires.
            </p>
          </div>
          <div>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 1.75, margin: '0 0 1rem' }}>
              <strong style={{ color: 'var(--foreground)' }}>Block Explorer.</strong> The HoodScan block explorer tracks every block produced on Robinhood Chain mainnet with block height, timestamp, transaction count, and gas usage. The{' '}
              <Link href="/tokens" style={{ color: 'var(--primary)' }}>token explorer</Link> displays live prices from GeckoTerminal DEX data, holder counts from Blockscout indexing, 24-hour trading volume, and liquidity depth. Rankings are available by{' '}
              <Link href="/tokens/trending" style={{ color: 'var(--primary)' }}>trending activity</Link>,{' '}
              <Link href="/tokens/most-held" style={{ color: 'var(--primary)' }}>holder count</Link>,{' '}
              <Link href="/tokens/most-traded" style={{ color: 'var(--primary)' }}>trading volume</Link>, and price performance.
            </p>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 1.75, margin: 0 }}>
              <strong style={{ color: 'var(--foreground)' }}>Smart Contract Explorer.</strong> Developers can use HoodScan to browse{' '}
              <Link href="/contracts" style={{ color: 'var(--primary)' }}>verified smart contracts</Link> on Robinhood Chain, including Solidity source code, ABI data, compiler version and verification status. The{' '}
              <Link href="/analytics" style={{ color: 'var(--primary)' }}>on-chain analytics</Link> section tracks real-time gas prices, network throughput, active address counts and{' '}
              <Link href="/analytics/dex-activity" style={{ color: 'var(--primary)' }}>decentralized exchange activity</Link> across all DEX protocols deployed on the network.
            </p>
          </div>
          <div>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 1.75, margin: '0 0 1rem' }}>
              <strong style={{ color: 'var(--foreground)' }}>On-Chain Analytics.</strong> HoodScan{`'`}s{' '}
              <Link href="/analytics/network-stats" style={{ color: 'var(--primary)' }}>network statistics</Link> include block production rate, total transaction counts, daily active wallets and average gas usage. The{' '}
              <Link href="/analytics/gas-tracker" style={{ color: 'var(--primary)' }}>gas tracker</Link> shows current slow, standard and fast fee estimates for Robinhood Chain transactions. The{' '}
              <Link href="/analytics/top-accounts" style={{ color: 'var(--primary)' }}>top accounts</Link> page ranks the largest wallet holders by native token balance.
            </p>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 1.75, margin: 0 }}>
              Robinhood Chain is fully EVM-compatible, meaning standard Ethereum development tools, wallets and libraries work natively on the network. HoodScan is free to use and does not require account registration. All data is sourced from public blockchain records, Blockscout indexing, and GeckoTerminal DEX data. Network data refreshes in real time with each new block.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
