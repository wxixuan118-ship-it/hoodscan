import type { Metadata } from 'next';
import Link from 'next/link';
import { formatDate, timeAgo } from '@/lib/utils';
import { getTransaction } from '@/lib/robinhood-rpc';
import { notFound } from 'next/navigation';

type Props = { params: Promise<{ hash: string }> };

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { hash } = await params;
  return {
    title: `Tx ${hash.slice(0, 18)}… | Robinhood Chain Explorer`,
    description: `Transaction ${hash} on Robinhood Chain — status, block number, from/to addresses, value transferred and gas fee.`,
    alternates: { canonical: `https://www.hood-chain.com/tx/${hash}` },
    openGraph: {
      title: `Transaction ${hash.slice(0, 14)}… | HoodScan`,
      description: `On-chain transaction details on Robinhood Chain.`,
    },
  };
}

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div style={{ display: 'flex', padding: '0.875rem 1.5rem', borderBottom: '1px solid var(--border)', gap: '1rem', flexWrap: 'wrap' }}>
    <dt style={{ color: 'var(--muted)', fontSize: '0.875rem', minWidth: 200, flexShrink: 0 }}>{label}</dt>
    <dd style={{ fontSize: '0.875rem', margin: 0, wordBreak: 'break-all' }}>{value}</dd>
  </div>
);

export default async function TxPage({ params }: Props) {
  const { hash } = await params;
  const tx = await getTransaction(hash);
  if (!tx) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Thing',
    name: `Robinhood Chain Transaction ${hash}`,
    identifier: hash,
    url: `https://www.hood-chain.com/tx/${hash}`,
    description: `Transaction on Robinhood Chain — Status: ${tx.status}, Value: ${tx.value} ETH`,
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Transaction Details</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <code style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.375rem 0.75rem', fontSize: '0.8rem', wordBreak: 'break-all' }}>
            {hash}
          </code>
          <span style={{
            padding: '0.3rem 0.75rem', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600,
            background: tx.status === 'success' ? 'rgba(34,197,94,0.1)' : tx.status === 'pending' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
            color: tx.status === 'success' ? 'var(--success)' : tx.status === 'pending' ? 'var(--warning)' : 'var(--danger)',
          }}>
            {tx.status === 'success' ? '✓ Success' : tx.status === 'pending' ? 'Pending' : '✗ Failed'}
          </span>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <dl style={{ margin: 0 }}>
          <Row label="Status" value={
            <span style={{
              padding: '0.2rem 0.6rem', borderRadius: 4, fontSize: '0.85rem', fontWeight: 600,
              background: tx.status === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              color: tx.status === 'success' ? 'var(--success)' : 'var(--danger)',
            }}>
              {tx.status === 'success' ? '✓ Success' : tx.status === 'pending' ? 'Pending' : '✗ Failed'}
            </span>
          } />
          <Row label="Block" value={
            <Link href={`/block/${tx.blockNumber}`}>
              {tx.blockNumber.toLocaleString()}
            </Link>
          } />
          <Row label="Timestamp" value={tx.timestamp ?
            <span>
              {timeAgo(tx.timestamp)}
              <span style={{ color: 'var(--muted)', marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                ({formatDate(tx.timestamp)})
              </span>
            </span> : 'Pending'
          } />
          <Row label="Transaction Hash" value={
            <code style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>{tx.hash}</code>
          } />
          <Row label="From" value={
            <Link href={`/address/${tx.from}`}>
              <code style={{ fontSize: '0.85rem' }}>{tx.from}</code>
            </Link>
          } />
          <Row label="To" value={tx.to ? <Link href={`/address/${tx.to}`}><code style={{ fontSize: '0.85rem' }}>{tx.to}</code></Link> : 'Contract creation'} />
          <Row label="Value" value={<strong>{parseFloat(tx.value).toFixed(8)} ETH</strong>} />
          <Row label="Gas Price" value={`${tx.gasPrice} Gwei`} />
          <Row label="Gas Limit" value={Number(tx.gasLimit).toLocaleString()} />
          <Row label="Gas Used" value={
            <span>
              {tx.gasUsed ? Number(tx.gasUsed).toLocaleString() : 'Pending'}
              <span style={{ color: 'var(--muted)', marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                {tx.gasUsed ? `(${(Number(tx.gasUsed) / Number(tx.gasLimit) * 100).toFixed(1)}%)` : ''}
              </span>
            </span>
          } />
          <Row label="Transaction Fee" value={<strong>{tx.fee ?? 'Pending'}{tx.fee ? ' ETH' : ''}</strong>} />
          <Row label="Nonce" value={tx.nonce} />
          <Row label="Input Data" value={
            tx.input === '0x'
              ? <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>0x (Native ETH transfer)</span>
              : (
                <details>
                  <summary style={{ cursor: 'pointer', color: 'var(--primary)' }}>View input data ({tx.input.length / 2 - 1} bytes)</summary>
                  <code style={{ display: 'block', marginTop: '0.5rem', padding: '0.75rem', background: 'var(--surface-2)', borderRadius: 6, fontSize: '0.75rem', wordBreak: 'break-all', lineHeight: 1.5 }}>
                    {tx.input}
                  </code>
                </details>
              )
          } />
        </dl>
      </div>
    </div>
  );
}
