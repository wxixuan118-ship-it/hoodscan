import Link from 'next/link';

const LINKS = [
  { label: 'All Tokens',   href: '/tokens' },
  { label: 'Trending',     href: '/tokens/trending' },
  { label: 'New Tokens',   href: '/tokens/new' },
  { label: 'Most Held',    href: '/tokens/most-held' },
  { label: 'Most Traded',  href: '/tokens/most-traded' },
  { label: 'Top Gainers',  href: '/tokens/top-gainers' },
];

export default function TokenNav({ current }: { current: string }) {
  const others = LINKS.filter(l => l.href !== current);
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.35rem 0.75rem',
      padding: '0.75rem 1rem', marginBottom: '1.5rem',
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
      fontSize: '0.82rem',
    }}>
      <span style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>Explore more Robinhood Chain token data:</span>
      {others.map(l => (
        <Link key={l.href} href={l.href} style={{
          color: 'var(--primary)', textDecoration: 'none', whiteSpace: 'nowrap',
          padding: '0.15rem 0.5rem', borderRadius: 6, border: '1px solid var(--border)',
        }}>
          → {l.label}
        </Link>
      ))}
    </div>
  );
}
