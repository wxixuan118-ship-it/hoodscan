import type { Metadata } from 'next';
import Link from 'next/link';
import { getIndexStats } from '@/lib/blockscout';
import { getLatestBlocks } from '@/lib/robinhood-rpc';
import { getDailyStats } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Network Stats | Robinhood Chain Explorer',
  description: 'Real-time network statistics for Robinhood Chain — total transactions, active addresses, block production rate, gas prices and on-chain activity.',
  alternates: { canonical: 'https://www.hood-chain.com/stats' },
};

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem' }}>
      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

export default async function StatsPage() {
  const [stats, recentBlocks, dailyStats] = await Promise.all([
    getIndexStats().catch(() => null),
    getLatestBlocks(20).catch(() => []),
    getDailyStats(14).catch(() => []),
  ]);

  // Compute avg block time from recent blocks
  let avgBlockTime = '—';
  if (recentBlocks.length >= 2) {
    const diffs: number[] = [];
    for (let i = 0; i < recentBlocks.length - 1; i++) {
      diffs.push(recentBlocks[i].timestamp - recentBlocks[i + 1].timestamp);
    }
    const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    avgBlockTime = `${avg.toFixed(1)}s`;
  }

  // Avg gas used % from recent blocks
  const avgGasUsed = recentBlocks.length
    ? recentBlocks.reduce((s, b) => {
        const pct = b.gasLimit !== '0' ? Number(b.gasUsed) / Number(b.gasLimit) * 100 : 0;
        return s + pct;
      }, 0) / recentBlocks.length
    : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Robinhood Chain Network Stats',
    url: 'https://www.hood-chain.com/stats',
    description: 'Live network statistics for Robinhood Chain (Chain ID 4663).',
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.5rem', letterSpacing: '-0.5px' }}>Network Statistics</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: 0 }}>
          Live on-chain data for Robinhood Chain · Chain ID 4663 · EVM-compatible Arbitrum L2
        </p>
      </div>

      {/* Key stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard
          label="Total Transactions"
          value={stats ? stats.totalTransactions.toLocaleString() : '—'}
          sub="all-time on-chain"
        />
        <StatCard
          label="Total Blocks"
          value={stats ? stats.totalBlocks.toLocaleString() : '—'}
          sub="since genesis"
        />
        <StatCard
          label="Total Addresses"
          value={stats ? stats.totalAddresses.toLocaleString() : '—'}
          sub="unique wallets seen"
        />
        <StatCard
          label="Txns Today"
          value={stats ? stats.transactionsToday.toLocaleString() : '—'}
          sub={`~${stats?.tps ?? '—'} TPS`}
        />
        <StatCard
          label="Avg Block Time"
          value={avgBlockTime}
          sub="last 20 blocks"
        />
        <StatCard
          label="Avg Gas Used"
          value={avgGasUsed !== null ? `${avgGasUsed.toFixed(1)}%` : '—'}
          sub={`of block gas limit`}
        />
        <StatCard
          label="Gas Price"
          value={stats?.gasPrice ?? '—'}
          sub="current average"
        />
      </div>

      {/* Recent blocks gas usage bar chart */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1.25rem' }}>Gas Used per Block (last 20 blocks)</h2>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100 }}>
          {recentBlocks.slice().reverse().map((block) => {
            const pct = block.gasLimit !== '0'
              ? Math.min(100, Number(block.gasUsed) / Number(block.gasLimit) * 100)
              : 0;
            return (
              <div key={block.number} title={`Block #${block.number.toLocaleString()} — ${pct.toFixed(1)}% gas used`}
                style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: '100%', background: 'var(--border)', borderRadius: 2, height: 88, display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
                  <div style={{
                    width: '100%',
                    height: `${pct}%`,
                    background: pct > 80 ? 'var(--danger)' : pct > 50 ? 'var(--primary)' : 'var(--success)',
                    borderRadius: 2,
                    transition: 'height .2s',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.7rem', color: 'var(--muted)' }}>
          <span>oldest</span>
          <span>latest</span>
        </div>
      </div>

      {/* Historical daily stats from Postgres */}
      {dailyStats.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: '2rem' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Daily Activity (last {dailyStats.length} days)</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr>
                  {['Date', 'Transactions', 'Active Addresses', 'Token Transfers', 'Avg Gas (Gwei)'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1.5rem', textAlign: 'left', color: 'var(--muted)', fontWeight: 500, fontSize: '0.8rem', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dailyStats.map(row => (
                  <tr key={row.date}>
                    <td style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{row.date}</td>
                    <td style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)' }}>{row.total_transactions?.toLocaleString() ?? '—'}</td>
                    <td style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)' }}>{row.active_addresses?.toLocaleString() ?? '—'}</td>
                    <td style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)' }}>{row.token_transfers?.toLocaleString() ?? '—'}</td>
                    <td style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)' }}>{row.avg_gas_gwei?.toFixed(2) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
        <Link href="/blocks" style={{ color: 'var(--primary)' }}>View latest blocks →</Link>
        <Link href="/gas-tracker" style={{ color: 'var(--primary)' }}>Gas Tracker →</Link>
      </div>
    </div>
  );
}
