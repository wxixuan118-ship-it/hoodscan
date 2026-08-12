import Link from 'next/link';

const LINKS = [
  { label: 'Analytics Hub',   href: '/analytics' },
  { label: 'Network Stats',   href: '/analytics/network-stats' },
  { label: 'Gas Tracker',     href: '/analytics/gas-tracker' },
  { label: 'Top Accounts',    href: '/analytics/top-accounts' },
  { label: 'Token Analytics', href: '/analytics/token' },
  { label: 'DEX Activity',    href: '/analytics/dex-activity' },
];

type Crumb = { label: string; href?: string };

export default function AnalyticsNav({
  current,
  breadcrumbs,
}: {
  current: string;
  breadcrumbs: Crumb[];
}) {
  const others = LINKS.filter(l => l.href !== current);
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <nav aria-label="breadcrumb" style={{
        fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.75rem',
        display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap',
      }}>
        <Link href="/" style={{ color: 'var(--muted)', textDecoration: 'none' }}>HoodScan</Link>
        {breadcrumbs.map((crumb, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span aria-hidden>›</span>
            {crumb.href ? (
              <Link href={crumb.href} style={{ color: 'var(--muted)', textDecoration: 'none' }}>{crumb.label}</Link>
            ) : (
              <span style={{ color: 'var(--foreground)' }}>{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.35rem 0.75rem',
        padding: '0.75rem 1rem',
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
        fontSize: '0.82rem',
      }}>
        <span style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>Robinhood Chain analytics:</span>
        {others.map(l => (
          <Link key={l.href} href={l.href} style={{
            color: 'var(--primary)', textDecoration: 'none', whiteSpace: 'nowrap',
            padding: '0.15rem 0.5rem', borderRadius: 6, border: '1px solid var(--border)',
          }}>
            → {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
