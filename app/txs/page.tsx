import type { Metadata } from 'next';
import Link from 'next/link';
import { getTransactions } from '@/lib/blockscout';
import { shortenAddress, shortenHash, timeAgo } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Transactions | Robinhood Chain',
  description: 'Browse all transactions on Robinhood Chain. View transaction hashes, addresses, values and gas fees.',
};

const TD: React.CSSProperties = { padding: '0.875rem 1.25rem', fontSize: '0.875rem', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' };
const TH: React.CSSProperties = { padding: '0.75rem 1.25rem', textAlign: 'left', color: 'var(--muted)', fontWeight: 500, fontSize: '0.8rem', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' };

export const revalidate = 12;

export default async function TxsPage() {
  const transactions = await getTransactions();
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.25rem' }}>Transactions</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>
          Showing the latest {transactions.length} indexed transactions on Robinhood Chain
        </p>
      </div>

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
