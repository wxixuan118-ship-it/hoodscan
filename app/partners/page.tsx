import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Partners | HoodScan',
  description: 'HoodScan partner websites.',
  robots: { index: false, follow: false },
};

const PARTNERS = [
  { name: 'FishCare AI',                  url: 'https://www.fishcareai.com' },
  { name: 'AnySites',                     url: 'https://www.anysites.app' },
  { name: 'Disclaimer Snippets',          url: 'https://www.disclaimersnippets.com' },
  { name: 'Cursive Text Generator',       url: 'https://www.cursive-text-generator.net' },
  { name: 'Online Kings Cup',             url: 'https://www.onlinekingscup.com' },
  { name: 'Hood Chain',                   url: 'https://www.hood-chain.com' },
  { name: 'Paychecks Calculator',         url: 'https://www.paycheckscalculator.org' },
  { name: 'Gravel Calculate',             url: 'https://www.gravelcalculate.com' },
  { name: 'Peptide Calculator',           url: 'https://www.peptide-calculator.uk' },
  { name: 'Chronological Age Calculator', url: 'https://www.chronologicalagercalculator.com' },
  { name: 'Recommendation Letters',       url: 'https://www.recommendation-letters.com' },
];

export default function PartnersPage() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.5rem', letterSpacing: '-0.5px' }}>Partners</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '0 0 2.5rem' }}>
        Websites we collaborate with and recommend.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
        {PARTNERS.map(({ name, url }) => {
          const domain = url.replace(/^https?:\/\/www\./, '');
          return (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '1.25rem 1.5rem',
                textDecoration: 'none',
                transition: 'border-color 0.15s',
              }}
            >
              <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--foreground)' }}>{name}</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--primary)' }}>{domain}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
