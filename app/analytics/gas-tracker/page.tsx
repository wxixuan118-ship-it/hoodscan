import type { Metadata } from 'next';
import Link from 'next/link';
import AnalyticsNav from '@/components/AnalyticsNav';
import { getNetworkSnapshot, getLatestBlocks } from '@/lib/robinhood-rpc';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Robinhood Chain Gas Tracker | Current Gas Fees & Network Costs',
  description: 'Track current Robinhood Chain gas prices, transaction fees and network costs for blockchain transactions.',
  alternates: { canonical: 'https://www.hood-chain.com/analytics/gas-tracker' },
};

type Tier = { label: string; multiplier: number; eta: string; color: string; bg: string };

const TIERS: Tier[] = [
  { label: 'Slow',     multiplier: 1.0, eta: '~30s',  color: '#888',           bg: 'rgba(128,128,128,0.08)' },
  { label: 'Standard', multiplier: 1.2, eta: '~15s',  color: 'var(--primary)', bg: 'rgba(99,91,255,0.08)' },
  { label: 'Fast',     multiplier: 1.5, eta: '<5s',   color: 'var(--success)', bg: 'rgba(34,197,94,0.08)' },
];

export default async function GasTrackerPage() {
  const [snapshot, recentBlocks] = await Promise.all([
    getNetworkSnapshot().catch(() => null),
    getLatestBlocks(30).catch(() => []),
  ]);

  const baseGwei = snapshot
    ? parseFloat(snapshot.gasPrice.replace(' Gwei', ''))
    : null;

  const blockStats = recentBlocks.map(b => ({
    number: b.number,
    gasUsedPct: b.gasLimit !== '0'
      ? Number(b.gasUsed) / Number(b.gasLimit) * 100
      : 0,
  }));

  const avgUsedPct = blockStats.length
    ? blockStats.reduce((s, b) => s + b.gasUsedPct, 0) / blockStats.length
    : null;

  const maxPct = Math.max(...blockStats.map(b => b.gasUsedPct), 1);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Robinhood Chain Gas Tracker',
    url: 'https://www.hood-chain.com/analytics/gas-tracker',
    description: 'Real-time gas price tracker for Robinhood Chain (Chain ID 4663).',
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <AnalyticsNav
        current="/analytics/gas-tracker"
        breadcrumbs={[{ label: 'Analytics', href: '/analytics' }, { label: 'Gas Tracker' }]}
      />

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.5px' }}>
          Robinhood Chain Gas Tracker
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.925rem', margin: '0 0 0.25rem', lineHeight: 1.6 }}>
          Monitor real-time gas prices on Robinhood Chain.
        </p>
        <p style={{ color: 'var(--muted)', fontSize: '0.925rem', margin: 0, lineHeight: 1.6 }}>
          Estimate transaction costs and understand network fee activity across the mainnet.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {TIERS.map(tier => {
          const gwei = baseGwei !== null
            ? (baseGwei * tier.multiplier).toFixed(3).replace(/\.?0+$/, '')
            : '—';
          return (
            <div key={tier.label} style={{ background: tier.bg, border: `1px solid ${tier.color}33`, borderRadius: 12, padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>{tier.label}</div>
              <div style={{ fontSize: '2.25rem', fontWeight: 800, color: tier.color, letterSpacing: '-1px', marginBottom: 4 }}>
                {gwei}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 12 }}>Gwei</div>
              <div style={{ fontSize: '0.78rem', color: tier.color, fontWeight: 600, background: `${tier.color}18`, borderRadius: 20, padding: '0.2rem 0.75rem', display: 'inline-block' }}>
                {tier.eta}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem 1.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Current Block</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
            {snapshot ? `#${snapshot.blockHeight.toLocaleString()}` : '—'}
          </div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem 1.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Base Gas Price</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{snapshot?.gasPrice ?? '—'}</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem 1.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Avg Gas Used (30 blocks)</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
            {avgUsedPct !== null ? `${avgUsedPct.toFixed(1)}%` : '—'}
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1.25rem' }}>Gas Usage per Block (last 30 blocks)</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {blockStats.slice(0, 15).map(b => (
            <div key={b.number} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Link href={`/block/${b.number}`} style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'monospace', minWidth: 80, textAlign: 'right', flexShrink: 0 }}>
                #{b.number.toLocaleString()}
              </Link>
              <div style={{ flex: 1, height: 16, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${(b.gasUsedPct / maxPct) * 100}%`,
                  background: b.gasUsedPct > 80 ? 'var(--danger)' : b.gasUsedPct > 50 ? 'var(--primary)' : 'var(--success)',
                  borderRadius: 3,
                }} />
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)', minWidth: 40, flexShrink: 0 }}>{b.gasUsedPct.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem' }}>About Gas on Robinhood Chain</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 1.7, margin: '0 0 0.75rem' }}>
          Robinhood Chain is an Arbitrum-based L2. Gas fees are significantly lower than Ethereum mainnet.
          Transactions typically confirm within seconds at standard gas prices.
        </p>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 1.7, margin: 0 }}>
          The base gas price reflects the current <code>eth_gasPrice</code> RPC value.
          Slow / Standard / Fast tiers are estimated multipliers (1×, 1.2×, 1.5×).
        </p>
      </div>
    </div>
  );
}
