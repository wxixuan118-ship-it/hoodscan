import type { Metadata } from 'next';
import Link from 'next/link';
import { getLatestBlocks } from '@/lib/robinhood-rpc';
import { timeAgo, formatDate, formatGas } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Blocks | Robinhood Chain',
  description: 'Browse all blocks on Robinhood Chain. View block height, transactions, gas usage and miner information.',
};

export const revalidate = 6;

const TD: React.CSSProperties = { padding: '0.875rem 1.25rem', fontSize: '0.875rem', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' };
const TH: React.CSSProperties = { padding: '0.75rem 1.25rem', textAlign: 'left', color: 'var(--muted)', fontWeight: 500, fontSize: '0.8rem', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' };

export default async function BlocksPage() {
  const blocks = await getLatestBlocks(50).catch(() => []);
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.25rem' }}>Blocks</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>
          Showing the latest {blocks.length} blocks on Robinhood Chain mainnet
        </p>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--surface-2)' }}>
              <tr>
                {['Block', 'Age', 'Transactions', 'Gas Used', 'Gas Limit', 'Miner'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {blocks.map(block => (
                <tr key={block.number} style={{ transition: 'background 0.15s' }}>
                  <td style={TD}>
                    <Link href={`/block/${block.number}`} style={{ fontWeight: 600 }}>
                      {block.number.toLocaleString()}
                    </Link>
                  </td>
                  <td style={{ ...TD, color: 'var(--muted)' }} title={formatDate(block.timestamp)}>
                    {timeAgo(block.timestamp)}
                  </td>
                  <td style={TD}>{block.txCount}</td>
                  <td style={TD}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {formatGas(block.gasUsed)}
                      <div style={{ flex: 1, maxWidth: 80, height: 4, background: 'var(--border)', borderRadius: 2, minWidth: 60 }}>
                        <div style={{
                          height: '100%', borderRadius: 2, background: 'var(--primary)',
                          width: `${(Number(block.gasUsed) / Number(block.gasLimit) * 100).toFixed(1)}%`
                        }} />
                      </div>
                      <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
                        {(Number(block.gasUsed) / Number(block.gasLimit) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td style={{ ...TD, color: 'var(--muted)' }}>{formatGas(block.gasLimit)}</td>
                  <td style={{ ...TD, fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--muted)' }}>
                    <Link href={`/address/${block.miner}`}>
                      {block.miner.slice(0, 10)}...{block.miner.slice(-4)}
                    </Link>
                  </td>
                </tr>
              ))}
              {blocks.length === 0 && <tr><td colSpan={6} style={{ padding: '2rem', color: 'var(--muted)', textAlign: 'center' }}>Live RPC data is temporarily unavailable. Please retry shortly.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
