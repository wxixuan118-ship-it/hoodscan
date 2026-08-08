import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border)', marginTop: 'auto', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 24, height: 24, background: 'var(--primary)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 10, color: '#fff' }}>
            HS
          </div>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>HoodScan</span>
          <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>— Robinhood Chain Explorer</span>
        </div>

        <nav style={{ display: 'flex', gap: '1.5rem' }}>
          {[
            ['About', '/about'],
            ['Blocks', '/blocks'],
            ['Tokens', '/tokens'],
            ['Transactions', '/txs'],
            ['Wallet', '/wallet'],
            ['Partners', '/partners'],
          ].map(([label, href]) => (
            <Link key={href} href={href} style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
              {label}
            </Link>
          ))}
        </nav>

        <p style={{ color: 'var(--muted)', fontSize: '0.8rem', margin: 0 }}>
          © {new Date().getFullYear()} HoodScan. Data provided for informational purposes only.
        </p>
      </div>
    </footer>
  );
}
