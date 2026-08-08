import Link from 'next/link';
import { getLatestBlocks, getNetworkSnapshot } from '@/lib/robinhood-rpc';
import { getIndexStats, getTokens, getTransactions } from '@/lib/blockscout';
import { getTokenPrices } from '@/lib/price-service';
import { timeAgo, formatNumber } from '@/lib/utils';

export const revalidate = 12;

export default async function HomePage() {
  const [rpcStats, indexStats, latestBlocks, latestTxs, popularTokens] = await Promise.all([
    getNetworkSnapshot().catch(() => null), getIndexStats().catch(() => null),
    getLatestBlocks(6).then(b => [...b].sort((a, b) => b.number - a.number)).catch(() => []), getTransactions().catch(() => []),
    getTokens().then(tokens => getTokenPrices(tokens)).catch(() => []),
  ]);

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '2.25rem 1.5rem 3rem' }}>

      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--foreground)' }}>
          Robinhood Chain Explorer
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '1rem', margin: 0 }}>
          Live blocks, transactions, wallet balances, tokens, prices, and contract risk signals.
        </p>
      </div>

      {/* Network Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
        {[
          { label: 'Block Height', value: rpcStats?.blockHeight.toLocaleString() ?? indexStats?.totalBlocks.toLocaleString() ?? 'Unavailable' },
          { label: 'Total Transactions', value: indexStats ? formatNumber(indexStats.totalTransactions) : 'Unavailable' },
          { label: 'Total Addresses', value: indexStats ? formatNumber(indexStats.totalAddresses) : 'Unavailable' },
          { label: 'Gas Price', value: rpcStats?.gasPrice ?? indexStats?.gasPrice ?? 'Unavailable' },
          { label: '24h Avg TPS', value: indexStats?.tps ?? 'Unavailable' },
        ].map(({ label, value }) => (
          <div key={label} className="live-stat-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem 1.5rem' }}>
            <p style={{ color: 'var(--muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem' }}>{label}</p>
            <p className="live-number" style={{ fontWeight: 700, fontSize: '1.25rem', margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Latest Blocks + Transactions */}
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
                    <div><Link href={`/tx/${tx.hash}`} style={{ fontSize: '.84rem', fontFamily: 'monospace' }}>{tx.hash.slice(0, 12)}...{tx.hash.slice(-6)}</Link><p style={{ color: 'var(--muted)', fontSize: '.75rem', margin: '.2rem 0 0' }}>{timeAgo(tx.timestamp)}</p></div>
                    <div style={{ textAlign: 'right' }}><span style={{ color: tx.status === 'success' ? 'var(--success)' : 'var(--danger)', fontSize: '.75rem' }}>{tx.status}</span><p style={{ margin: '.2rem 0 0', fontSize: '.8rem' }}>{tx.value} ETH</p></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {latestTxs.length === 0 && <p style={{ color: 'var(--muted)', padding: '1.5rem', fontSize: '.82rem' }}>Indexed transactions are temporarily unavailable.</p>}
        </div>
      </div>

      {/* Popular Tokens */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>Popular Tokens</h2>
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
  );
}
