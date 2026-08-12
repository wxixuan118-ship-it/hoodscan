import type { Metadata } from 'next';
import Link from 'next/link';
import { getTransactions } from '@/lib/blockscout';
import { shortenAddress, shortenHash, timeAgo } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Robinhood Chain Transactions Explorer | Mainnet Transaction Tracker',
  description: 'Track Robinhood Chain transactions including transfers, contract calls, wallet activity and transaction status on mainnet.',
  alternates: { canonical: 'https://www.hood-chain.com/txs' },
};

export const revalidate = 12;

const COL = 'minmax(120px,1.5fr) minmax(80px,1fr) minmax(70px,1fr) minmax(120px,1.5fr) minmax(120px,1.5fr) minmax(80px,1fr) minmax(80px,1fr) minmax(80px,1fr)';
const HEADS = ['Tx Hash', 'Block', 'Age', 'From', 'To', 'Value (ETH)', 'Gas Fee', 'Status'];

export default async function TxsPage() {
  const transactions = await getTransactions();
  const doubled = [...transactions, ...transactions];
  const dur = `${Math.max(15, transactions.length * 0.85).toFixed(0)}s`;

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

      {transactions.length === 0 ? (
        <div className="tokens-empty">Transaction data is temporarily unavailable. Please retry shortly.</div>
      ) : (
        <div className="dsf-wrap">
          <div className="dsf-head" style={{ gridTemplateColumns: COL }}>
            {HEADS.map(h => <div key={h} className="dsf-head-cell">{h}</div>)}
          </div>
          <div className="dsf-window" style={{ height: 480 }}>
            <div className="dsf-track" style={{ '--dur': dur } as React.CSSProperties}>
              {doubled.map((tx, i) => (
                <div key={`${tx.hash}-${i}`} className="dsf-row" style={{ gridTemplateColumns: COL }}>
                  <div className="dsf-cell" style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
                    <Link href={`/tx/${tx.hash}`}>{shortenHash(tx.hash)}</Link>
                  </div>
                  <div className="dsf-cell">
                    <Link href={`/blocks?highlight=${tx.blockNumber}`}>
                      {tx.blockNumber.toLocaleString()}
                    </Link>
                  </div>
                  <div className="dsf-cell muted-cell">{timeAgo(tx.timestamp)}</div>
                  <div className="dsf-cell" style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
                    <Link href={`/address/${tx.from}`}>{shortenAddress(tx.from)}</Link>
                  </div>
                  <div className="dsf-cell" style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
                    {tx.to
                      ? <Link href={`/address/${tx.to}`}>{shortenAddress(tx.to)}</Link>
                      : <span className="muted-cell">Contract creation</span>}
                  </div>
                  <div className="dsf-cell">{parseFloat(tx.value).toFixed(4)}</div>
                  <div className="dsf-cell muted-cell" style={{ fontSize: '0.8rem' }}>{tx.fee} ETH</div>
                  <div className="dsf-cell">
                    <span style={{
                      padding: '0.2rem 0.5rem', borderRadius: 4, fontSize: '0.75rem', fontWeight: 500,
                      background: tx.status === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                      color: tx.status === 'success' ? 'var(--success)' : 'var(--danger)',
                    }}>
                      {tx.status === 'success' ? '✓' : '✗'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
