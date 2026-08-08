import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBlockByNumber } from '@/lib/robinhood-rpc';
import { formatDate, timeAgo } from '@/lib/utils';

type Props = { params: Promise<{ number: string }> };

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { number } = await params;
  return {
    title: `Block #${Number(number).toLocaleString()} | Robinhood Chain Explorer`,
    description: `Block #${number} on Robinhood Chain — transactions, gas usage, miner address and timestamp.`,
    alternates: { canonical: `https://www.hood-chain.com/block/${number}` },
    openGraph: {
      title: `Block #${Number(number).toLocaleString()} | HoodScan`,
      description: `Block details on Robinhood Chain (Chain ID 4663).`,
    },
  };
}

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div style={{ display: 'flex', padding: '0.875rem 1.5rem', borderBottom: '1px solid var(--border)', gap: '1rem', flexWrap: 'wrap' }}>
    <dt style={{ color: 'var(--muted)', fontSize: '0.875rem', minWidth: 200, flexShrink: 0 }}>{label}</dt>
    <dd style={{ fontSize: '0.875rem', margin: 0, wordBreak: 'break-all' }}>{value}</dd>
  </div>
);

export default async function BlockPage({ params }: Props) {
  const { number } = await params;
  const blockNumber = parseInt(number, 10);
  if (isNaN(blockNumber)) notFound();

  const block = await getBlockByNumber(blockNumber).catch(() => null);
  if (!block) notFound();

  const gasUsedPercent = block.gasLimit !== '0'
    ? (Number(block.gasUsed) / Number(block.gasLimit) * 100).toFixed(2)
    : '0';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Thing',
    name: `Robinhood Chain Block #${blockNumber}`,
    identifier: String(blockNumber),
    url: `https://www.hood-chain.com/block/${blockNumber}`,
    description: `Block #${blockNumber} — ${block.txCount} transactions, mined ${block.timestamp}`,
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
          Block #{blockNumber.toLocaleString()}
        </h1>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link
            href={`/block/${blockNumber - 1}`}
            style={{ padding: '0.3rem 0.75rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.8rem' }}
          >
            ← Previous
          </Link>
          <Link
            href={`/block/${blockNumber + 1}`}
            style={{ padding: '0.3rem 0.75rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.8rem' }}
          >
            Next →
          </Link>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <dl style={{ margin: 0 }}>
          <Row label="Block Height" value={<strong>{blockNumber.toLocaleString()}</strong>} />
          <Row label="Timestamp" value={
            <span>
              {timeAgo(block.timestamp)}
              <span style={{ color: 'var(--muted)', marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                ({formatDate(block.timestamp)})
              </span>
            </span>
          } />
          <Row label="Transactions" value={
            <Link href={`/txs`}>{block.txCount.toLocaleString()} transactions</Link>
          } />
          <Row label="Block Hash" value={
            <code style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>{block.hash}</code>
          } />
          <Row label="Miner" value={
            <Link href={`/address/${block.miner}`}>
              <code style={{ fontSize: '0.85rem' }}>{block.miner}</code>
            </Link>
          } />
          <Row label="Gas Used" value={
            <span>
              {Number(block.gasUsed).toLocaleString()}
              <span style={{ color: 'var(--muted)', marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                ({gasUsedPercent}%)
              </span>
              <span style={{
                display: 'inline-block', marginLeft: '0.75rem', height: 8, width: 120,
                background: 'var(--border)', borderRadius: 4, verticalAlign: 'middle', overflow: 'hidden',
              }}>
                <span style={{
                  display: 'block', height: '100%', background: 'var(--primary)',
                  width: `${gasUsedPercent}%`, borderRadius: 4,
                }} />
              </span>
            </span>
          } />
          <Row label="Gas Limit" value={Number(block.gasLimit).toLocaleString()} />
          <Row label="Block Size" value={`${block.size.toLocaleString()} bytes`} />
        </dl>
      </div>

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
        <Link href="/blocks" style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
          ← Back to Blocks
        </Link>
      </div>
    </div>
  );
}
