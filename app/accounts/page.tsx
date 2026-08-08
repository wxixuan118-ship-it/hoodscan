import type { Metadata } from 'next';
import Link from 'next/link';
import { formatEther } from '@/lib/robinhood-rpc';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Top Accounts | Robinhood Chain Explorer',
  description: 'Wallets and contracts holding the most ETH on Robinhood Chain. Ranked by native ETH balance.',
  alternates: { canonical: 'https://www.hood-chain.com/accounts' },
};

type BsAddress = {
  hash: string;
  name: string | null;
  is_contract: boolean;
  coin_balance: string | null;
  transaction_count: number;
  token_count: number;
};

async function getTopAccounts(limit = 50): Promise<BsAddress[]> {
  try {
    const res = await fetch(
      `https://robinhoodchain.blockscout.com/api/v2/addresses?sort=coin_balance&order=desc&limit=${limit}`,
      { headers: { accept: 'application/json' }, next: { revalidate: 120 }, signal: AbortSignal.timeout(15_000) }
    );
    if (!res.ok) return [];
    const data = await res.json() as { items: BsAddress[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

export default async function AccountsPage() {
  const accounts = await getTopAccounts(50);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Top ETH Holders on Robinhood Chain',
    url: 'https://www.hood-chain.com/accounts',
    numberOfItems: accounts.length,
    itemListElement: accounts.slice(0, 10).map((a, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: a.name ?? a.hash,
      url: `https://www.hood-chain.com/address/${a.hash}`,
    })),
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.5rem', letterSpacing: '-0.5px' }}>Top Accounts</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: 0 }}>
          Wallets and contracts with the highest ETH balance on Robinhood Chain · ranked by native token holdings
        </p>
      </div>

      {accounts.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
          Could not load account data — Blockscout API may be temporarily unavailable.
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr>
                  {['#', 'Address', 'Name / Type', 'ETH Balance', 'Txns', 'Tokens'].map(h => (
                    <th key={h} style={{ padding: '0.875rem 1.5rem', textAlign: 'left', color: 'var(--muted)', fontWeight: 500, fontSize: '0.8rem', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {accounts.map((account, i) => {
                  const balance = account.coin_balance
                    ? parseFloat(formatEther(BigInt(account.coin_balance))).toFixed(4)
                    : '0';
                  return (
                    <tr key={account.hash} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.875rem 1.5rem', color: 'var(--muted)', fontWeight: 600, width: 48 }}>{i + 1}</td>
                      <td style={{ padding: '0.875rem 1.5rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        <Link href={`/address/${account.hash}`}>
                          {account.hash.slice(0, 10)}…{account.hash.slice(-8)}
                        </Link>
                      </td>
                      <td style={{ padding: '0.875rem 1.5rem' }}>
                        {account.name ? (
                          <span style={{ fontWeight: 500 }}>{account.name}</span>
                        ) : (
                          <span style={{
                            fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: 4,
                            background: account.is_contract ? 'rgba(99,91,255,0.1)' : 'rgba(34,197,94,0.1)',
                            color: account.is_contract ? 'var(--primary)' : 'var(--success)',
                            fontWeight: 600,
                          }}>
                            {account.is_contract ? 'Contract' : 'Wallet'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.875rem 1.5rem', fontWeight: 600 }}>{balance} ETH</td>
                      <td style={{ padding: '0.875rem 1.5rem', color: 'var(--muted)' }}>{account.transaction_count.toLocaleString()}</td>
                      <td style={{ padding: '0.875rem 1.5rem', color: 'var(--muted)' }}>{account.token_count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
        Data sourced from Blockscout · sorted by native ETH balance · updated every 2 minutes
      </div>
    </div>
  );
}
