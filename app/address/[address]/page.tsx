import type { Metadata } from 'next';
import Link from 'next/link';
import { shortenHash, timeAgo, formatDate } from '@/lib/utils';
import { getNativeBalance } from '@/lib/robinhood-rpc';
import { getAddressTokenBalances, getAddressTransactions } from '@/lib/blockscout';

type Props = { params: Promise<{ address: string }> };

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { address } = await params;
  return {
    title: `${address.slice(0, 10)}… Wallet | Robinhood Chain Explorer`,
    description: `Wallet balance, token holdings and transaction history for address ${address} on Robinhood Chain (Chain ID 4663).`,
    alternates: { canonical: `https://www.hood-chain.com/address/${address}` },
    openGraph: {
      title: `Wallet ${address.slice(0, 10)}… | HoodScan`,
      description: `On-chain activity for ${address} on Robinhood Chain.`,
    },
  };
}

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div style={{ display: 'flex', padding: '0.875rem 0', borderBottom: '1px solid var(--border)', gap: '1rem' }}>
    <dt style={{ color: 'var(--muted)', fontSize: '0.875rem', minWidth: 180 }}>{label}</dt>
    <dd style={{ fontSize: '0.875rem', margin: 0 }}>{value}</dd>
  </div>
);

export default async function AddressPage({ params }: Props) {
  const { address } = await params;

  const [ethBalance, displayTxs, tokenBalances] = await Promise.all([
    getNativeBalance(address), getAddressTransactions(address), getAddressTokenBalances(address),
  ]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Thing',
    name: `Robinhood Chain Address ${address}`,
    identifier: address,
    url: `https://www.hood-chain.com/address/${address}`,
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Address Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: `hsl(${parseInt(address.slice(2, 6), 16) % 360}, 70%, 50%)`, flexShrink: 0 }} />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Wallet Address</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <code style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}>
            {address}
          </code>
          <span style={{ background: 'rgba(99,91,255,0.1)', color: 'var(--primary)', borderRadius: 4, padding: '0.2rem 0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>
            Robinhood Chain
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>

        {/* Balance */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '0.95rem', margin: '0 0 1rem' }}>Overview</h2>
          <dl style={{ margin: 0 }}>
            <Row label="ETH Balance" value={<strong>{ethBalance} ETH</strong>} />
            <Row label="Transaction Count" value={displayTxs.length} />
            <Row label="Oldest shown" value={displayTxs.length ? formatDate(displayTxs[displayTxs.length - 1].timestamp) : 'No indexed transactions'} />
            <Row label="Last Seen" value={displayTxs.length ? timeAgo(displayTxs[0].timestamp) : '—'} />
          </dl>
        </div>

        {/* Token Holdings */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '0.95rem', margin: '0 0 1rem' }}>Token Holdings</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {tokenBalances.slice(0, 8).map(({ token, balance }) => (
              <div key={token.address} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: 28, height: 28, background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 700 }}>
                    {token.symbol.slice(0, 2)}
                  </div>
                  <Link href={`/token/${token.address}`} style={{ fontSize: '0.875rem', fontWeight: 500 }}>{token.name}</Link>
                </div>
                <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>{balance} {token.symbol}</span>
              </div>
            ))}
            {tokenBalances.length === 0 && <span style={{ color: 'var(--muted)', fontSize: '.85rem' }}>No ERC-20 balances indexed.</span>}
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>
            Transactions ({displayTxs.length})
          </h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr>
                {['Tx Hash', 'Age', 'From', 'To', 'Value (ETH)', 'Status'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1.5rem', textAlign: 'left', color: 'var(--muted)', fontWeight: 500, fontSize: '0.8rem', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayTxs.map(tx => (
                <tr key={tx.hash}>
                  <td style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid var(--border)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    <Link href={`/tx/${tx.hash}`}>{shortenHash(tx.hash)}</Link>
                  </td>
                  <td style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{timeAgo(tx.timestamp)}</td>
                  <td style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid var(--border)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    <span style={{
                      background: tx.from === address ? 'rgba(239,68,68,0.1)' : 'transparent',
                      color: tx.from === address ? 'var(--danger)' : undefined,
                      padding: tx.from === address ? '0.1rem 0.35rem' : 0, borderRadius: 3,
                    }}>
                      <Link href={`/address/${tx.from}`}>{tx.from.slice(0, 10)}...</Link>
                    </span>
                  </td>
                  <td style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid var(--border)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    <span style={{
                      background: tx.to === address ? 'rgba(34,197,94,0.1)' : 'transparent',
                      color: tx.to === address ? 'var(--success)' : undefined,
                      padding: tx.to === address ? '0.1rem 0.35rem' : 0, borderRadius: 3,
                    }}>
                      {tx.to ? <Link href={`/address/${tx.to}`}>{tx.to.slice(0, 10)}...</Link> : 'Contract creation'}
                    </span>
                  </td>
                  <td style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid var(--border)' }}>{parseFloat(tx.value).toFixed(4)}</td>
                  <td style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <span style={{
                      padding: '0.2rem 0.5rem', borderRadius: 4, fontSize: '0.75rem', fontWeight: 500,
                      background: tx.status === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                      color: tx.status === 'success' ? 'var(--success)' : 'var(--danger)',
                    }}>
                      {tx.status === 'success' ? '✓' : '✗'} {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
