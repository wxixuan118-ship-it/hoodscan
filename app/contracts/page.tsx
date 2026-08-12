import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Robinhood Chain Verified Contracts | Smart Contract Explorer',
  description: 'Browse verified smart contracts on Robinhood Chain. View contract source code, ABI, token contracts and blockchain developer information.',
  alternates: { canonical: 'https://www.hood-chain.com/contracts' },
};

export const revalidate = 120;

const BS_URL = 'https://robinhoodchain.blockscout.com/api/v2';

type SmartContract = {
  address: { hash: string; name: string | null };
  language: string | null;
  compiler_version: string | null;
  verified_at: string | null;
  transactions_count: number | null;
  optimization_enabled: boolean | null;
  license_type: string | null;
};

async function getVerifiedContracts(): Promise<SmartContract[]> {
  try {
    const res = await fetch(`${BS_URL}/smart-contracts`, {
      headers: { accept: 'application/json' },
      next: { revalidate: 120 },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    const data = await res.json() as { items: SmartContract[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

const TH: React.CSSProperties = {
  padding: '0.75rem 1.25rem', textAlign: 'left', color: 'var(--muted)',
  fontWeight: 500, fontSize: '0.8rem', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
};
const TD: React.CSSProperties = {
  padding: '0.875rem 1.25rem', fontSize: '0.875rem', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
};

export default async function ContractsPage() {
  const contracts = await getVerifiedContracts();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Verified Smart Contracts on Robinhood Chain',
    description: 'Verified Solidity smart contracts deployed on Robinhood Chain mainnet.',
    url: 'https://www.hood-chain.com/contracts',
    numberOfItems: contracts.length,
    itemListElement: contracts.slice(0, 10).map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.address.name ?? c.address.hash,
      url: `https://www.hood-chain.com/address/${c.address.hash}`,
    })),
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.75rem', letterSpacing: '-0.5px' }}>
          Robinhood Chain Verified Contracts
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.925rem', margin: '0 0 0.4rem', lineHeight: 1.6 }}>
          Verified contracts on Robinhood Chain allow developers and users to inspect published smart contract source code.
        </p>
        <p style={{ color: 'var(--muted)', fontSize: '0.925rem', margin: 0, lineHeight: 1.6 }}>
          Explore verified Solidity contracts, contract addresses and blockchain activity.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Verified Contracts', value: contracts.length.toString() },
          { label: 'Data source', value: 'Blockscout' },
          { label: 'Refresh', value: 'Every 2 min' },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem 1.25rem' }}>
            <p style={{ color: 'var(--muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.35rem' }}>{label}</p>
            <p style={{ fontWeight: 700, fontSize: '1.15rem', margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1rem' }}>
        Verified Smart Contracts on Robinhood Chain
      </h2>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--surface-2)' }}>
              <tr>
                {['Contract Address', 'Name', 'Language', 'Compiler', 'Optimization', 'Verified At'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contracts.map(contract => (
                <tr key={contract.address.hash}>
                  <td style={{ ...TD, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    <Link href={`/address/${contract.address.hash}`}>
                      {contract.address.hash.slice(0, 10)}…{contract.address.hash.slice(-6)}
                    </Link>
                  </td>
                  <td style={TD}>
                    {contract.address.name ? (
                      <Link href={`/address/${contract.address.hash}`} style={{ fontWeight: 600 }}>
                        {contract.address.name}
                      </Link>
                    ) : (
                      <span style={{ color: 'var(--muted)' }}>—</span>
                    )}
                  </td>
                  <td style={TD}>
                    <span style={{
                      fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: 4, fontWeight: 600,
                      background: 'rgba(99,91,255,0.1)', color: 'var(--primary)',
                    }}>
                      {contract.language ?? 'Solidity'}
                    </span>
                  </td>
                  <td style={{ ...TD, color: 'var(--muted)', fontSize: '0.8rem' }}>
                    {contract.compiler_version
                      ? contract.compiler_version.replace('v', '').split('+')[0]
                      : '—'}
                  </td>
                  <td style={TD}>
                    {contract.optimization_enabled === null ? (
                      <span style={{ color: 'var(--muted)' }}>—</span>
                    ) : contract.optimization_enabled ? (
                      <span style={{ color: 'var(--success)', fontSize: '0.8rem' }}>✓ Yes</span>
                    ) : (
                      <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>No</span>
                    )}
                  </td>
                  <td style={{ ...TD, color: 'var(--muted)', fontSize: '0.8rem' }}>
                    {contract.verified_at
                      ? new Date(contract.verified_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </td>
                </tr>
              ))}
              {contracts.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', color: 'var(--muted)', textAlign: 'center' }}>
                    Contract data is temporarily unavailable. Please retry shortly.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
        Data sourced from Blockscout · verified contract source code available on each contract page · updated every 2 minutes
      </p>
    </div>
  );
}
