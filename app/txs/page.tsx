import type { Metadata } from 'next';
import Link from 'next/link';
import { getTransactions } from '@/lib/blockscout';
import { shortenAddress, shortenHash, timeAgo } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Robinhood Chain Transactions Explorer | Mainnet Transaction Tracker',
  description: 'Track Robinhood Chain transactions including transfers, contract calls, wallet activity and transaction status on mainnet.',
  alternates: { canonical: 'https://www.hood-chain.com/txs' },
};

const TD: React.CSSProperties = { padding: '0.875rem 1.25rem', fontSize: '0.875rem', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' };
const TH: React.CSSProperties = { padding: '0.75rem 1.25rem', textAlign: 'left', color: 'var(--muted)', fontWeight: 500, fontSize: '0.8rem', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' };

export const revalidate = 12;

export default async function TxsPage() {
  const transactions = await getTransactions();
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.75rem', letterSpacing: '-0.5px' }}>
          Robinhood Chain Transactions Explorer
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.925rem', margin: '0 0 0.4rem', lineHeight: 1.6 }}>
          Track all transactions on Robinhood Chain.
        </p>
        <p style={{ color: 'var(--muted)', fontSize: '0.925rem', margin: 0, lineHeight: 1.6 }}>
          Search transaction hashes, monitor wallet activity and verify on-chain transfers.
        </p>
      </div>

      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1rem' }}>
        Latest Robinhood Chain Transactions
      </h2>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--surface-2)' }}>
              <tr>
                {['Tx Hash', 'Block', 'Age', 'From', 'To', 'Value (ETH)', 'Gas Fee', 'Status'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.hash}>
                  <td style={{ ...TD, fontFamily: 'monospace' }}>
                    <Link href={`/tx/${tx.hash}`}>{shortenHash(tx.hash)}</Link>
                  </td>
                  <td style={TD}>
                    <Link href={`/blocks?highlight=${tx.blockNumber}`}>
                      {tx.blockNumber.toLocaleString()}
                    </Link>
                  </td>
                  <td style={{ ...TD, color: 'var(--muted)' }}>{timeAgo(tx.timestamp)}</td>
                  <td style={{ ...TD, fontFamily: 'monospace' }}>
                    <Link href={`/address/${tx.from}`}>{shortenAddress(tx.from)}</Link>
                  </td>
                  <td style={{ ...TD, fontFamily: 'monospace' }}>
                    {tx.to ? <Link href={`/address/${tx.to}`}>{shortenAddress(tx.to)}</Link> : 'Contract creation'}
                  </td>
                  <td style={TD}>{parseFloat(tx.value).toFixed(4)}</td>
                  <td style={{ ...TD, color: 'var(--muted)', fontSize: '0.8rem' }}>
                    {tx.fee} ETH
                  </td>
                  <td style={TD}>
                    <span style={{
                      padding: '0.2rem 0.5rem', borderRadius: 4, fontSize: '0.75rem', fontWeight: 500,
                      background: tx.status === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                      color: tx.status === 'success' ? 'var(--success)' : 'var(--danger)',
                    }}>
                      {tx.status === 'success' ? '✓ Success' : '✗ Failed'}
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
