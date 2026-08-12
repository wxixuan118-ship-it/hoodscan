import type { Metadata } from 'next';
import Link from 'next/link';
import { getLatestBlocks } from '@/lib/robinhood-rpc';
import { timeAgo, formatDate, formatGas } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Robinhood Chain Blocks Explorer | Latest Mainnet Blocks',
  description: 'Explore the latest Robinhood Chain blocks. View block height, timestamp, transactions, gas usage and on-chain activity on Robinhood Chain mainnet.',
  alternates: { canonical: 'https://www.hood-chain.com/blocks' },
};

export const revalidate = 6;

const COL = 'minmax(100px,1fr) minmax(80px,1fr) minmax(80px,1fr) minmax(180px,2fr) minmax(80px,1fr) minmax(130px,1.5fr)';
const HEADS = ['Block', 'Age', 'Transactions', 'Gas Used', 'Gas Limit', 'Miner'];

export default async function BlocksPage() {
  const blocks = await getLatestBlocks(50).catch(() => []);
  const doubled = [...blocks, ...blocks];
  const dur = `${Math.max(15, blocks.length * 0.85).toFixed(0)}s`;

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.75rem', letterSpacing: '-0.5px' }}>
          Robinhood Chain Blocks Explorer
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.925rem', margin: '0 0 0.4rem', lineHeight: 1.6 }}>
          Hood Chain Blocks Explorer allows users to track every block produced on Robinhood Chain mainnet.
        </p>
        <p style={{ color: 'var(--muted)', fontSize: '0.925rem', margin: 0, lineHeight: 1.6 }}>
          View block numbers, transaction counts, timestamps and blockchain activity in real time.
        </p>
      </div>

      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1rem' }}>
        Latest Blocks on Robinhood Chain
      </h2>

      {blocks.length === 0 ? (
        <div className="tokens-empty">Live RPC data is temporarily unavailable. Please retry shortly.</div>
      ) : (
        <div className="dsf-wrap">
          <div className="dsf-head" style={{ gridTemplateColumns: COL }}>
            {HEADS.map(h => <div key={h} className="dsf-head-cell">{h}</div>)}
          </div>
          <div className="dsf-window" style={{ height: 480 }}>
            <div className="dsf-track" style={{ '--dur': dur } as React.CSSProperties}>
              {doubled.map((block, i) => (
                <div key={`${block.number}-${i}`} className="dsf-row" style={{ gridTemplateColumns: COL }}>
                  <div className="dsf-cell">
                    <Link href={`/block/${block.number}`} style={{ fontWeight: 600 }}>
                      {block.number.toLocaleString()}
                    </Link>
                  </div>
                  <div className="dsf-cell muted-cell" title={formatDate(block.timestamp)}>
                    {timeAgo(block.timestamp)}
                  </div>
                  <div className="dsf-cell">{block.txCount}</div>
                  <div className="dsf-cell" style={{ gap: '0.5rem' }}>
                    <span>{formatGas(block.gasUsed)}</span>
                    <div style={{ flex: 1, maxWidth: 70, height: 4, background: 'var(--border)', borderRadius: 2 }}>
                      <div style={{
                        height: '100%', borderRadius: 2, background: 'var(--primary)',
                        width: `${(Number(block.gasUsed) / Number(block.gasLimit) * 100).toFixed(1)}%`,
                      }} />
                    </div>
                    <span className="muted-cell" style={{ fontSize: '0.73rem' }}>
                      {(Number(block.gasUsed) / Number(block.gasLimit) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="dsf-cell muted-cell">{formatGas(block.gasLimit)}</div>
                  <div className="dsf-cell" style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                    <Link href={`/address/${block.miner}`} className="muted-cell">
                      {block.miner.slice(0, 10)}…{block.miner.slice(-4)}
                    </Link>
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
