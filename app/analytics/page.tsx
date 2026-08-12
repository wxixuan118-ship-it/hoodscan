import type { Metadata } from 'next';
import Link from 'next/link';
import AnalyticsNav from '@/components/AnalyticsNav';

export const metadata: Metadata = {
  title: 'Robinhood Chain Analytics | On-Chain Data & Network Statistics',
  description: 'Explore Robinhood Chain analytics including network statistics, gas tracker, top accounts, token activity and decentralized exchange data.',
  alternates: { canonical: 'https://www.hood-chain.com/analytics' },
};

const SECTIONS = [
  {
    href: '/analytics/network-stats',
    title: 'Network Stats',
    desc: 'Block height, total transactions, active wallets, TPS and gas usage on Robinhood Chain.',
    badge: 'Live',
    keywords: 'robinhood chain network stats',
  },
  {
    href: '/analytics/gas-tracker',
    title: 'Gas Tracker',
    desc: 'Current gas prices on Robinhood Chain. Slow, standard and fast fee tiers with per-block usage chart.',
    badge: 'Live',
    keywords: 'robinhood chain gas tracker',
  },
  {
    href: '/analytics/top-accounts',
    title: 'Top Accounts',
    desc: 'Largest wallet addresses on Robinhood Chain ranked by ETH balance and transaction count.',
    badge: null,
    keywords: 'robinhood chain top accounts',
  },
  {
    href: '/analytics/token',
    title: 'Token Analytics',
    desc: 'Token holder distribution, new token deployments, token transfers and whale wallet activity.',
    badge: null,
    keywords: 'robinhood chain token analytics',
  },
  {
    href: '/analytics/dex-activity',
    title: 'DEX Activity',
    desc: 'Decentralized exchange trading volume, swaps, liquidity pools and popular trading pairs.',
    badge: null,
    keywords: 'robinhood chain dex activity',
  },
];

export default function AnalyticsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Robinhood Chain Analytics',
    description: 'On-chain analytics and network statistics dashboard for Robinhood Chain mainnet.',
    url: 'https://www.hood-chain.com/analytics',
    hasPart: SECTIONS.map(s => ({
      '@type': 'WebPage',
      name: s.title,
      url: `https://www.hood-chain.com${s.href}`,
      description: s.desc,
    })),
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <AnalyticsNav current="/analytics" breadcrumbs={[{ label: 'Analytics' }]} />

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.75rem', letterSpacing: '-0.5px' }}>
          Robinhood Chain Analytics
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.925rem', margin: '0 0 0.4rem', lineHeight: 1.6 }}>
          Analyze Robinhood Chain mainnet activity with real-time on-chain data.
        </p>
        <p style={{ color: 'var(--muted)', fontSize: '0.925rem', margin: 0, lineHeight: 1.6 }}>
          Track network performance, gas usage, wallet activity, token movements and DeFi ecosystem metrics.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {SECTIONS.map(s => (
          <Link key={s.href} href={s.href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
              padding: '1.5rem', height: '100%', boxSizing: 'border-box',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <strong style={{ fontSize: '1rem', color: 'var(--foreground)' }}>{s.title}</strong>
                {s.badge && (
                  <span style={{
                    fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: 20,
                    background: 'rgba(34,197,94,0.12)', color: 'var(--success)',
                    fontWeight: 700, letterSpacing: '0.05em',
                  }}>{s.badge}</span>
                )}
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: '0 0 1rem', lineHeight: 1.6 }}>{s.desc}</p>
              <span style={{ color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 600 }}>View →</span>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ marginTop: '2.5rem', padding: '1.25rem 1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--foreground)' }}>Data sources:</strong>{' '}
          Network data from{' '}
          <a href="https://robinhoodchain.blockscout.com" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>Blockscout</a>{' '}
          · DEX and token data from{' '}
          <a href="https://www.geckoterminal.com/robinhood/pools" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>GeckoTerminal</a>{' '}
          · Gas prices from Robinhood Chain RPC · Chain ID 4663
        </p>
      </div>
    </div>
  );
}
