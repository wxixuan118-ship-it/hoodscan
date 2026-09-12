import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatNumber, shortenAddress, shortenHash, timeAgo } from '@/lib/utils';
import { getTokenSnapshot, SITE_URL } from '@/lib/seo';
import SnapshotNotice from '@/components/SnapshotNotice';

type Props = { params: Promise<{ address: string }> };
export const revalidate = 3600;
export async function generateStaticParams() { return []; }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { address } = await params;
  const snapshot = await getTokenSnapshot(address);
  const token = snapshot?.payload.token;
  return {
    robots: { index: false, follow: true },
    alternates: { canonical: `${SITE_URL}/token/${address.toLowerCase()}/transfers` },
    title: token ? `${token.name} (${token.symbol}) Transfers on Robinhood Chain | HoodScan` : 'Robinhood Chain Token Transfers | HoodScan',
    description: token ? `Track latest ${token.symbol} token transfers on Robinhood Chain, including sender, receiver, amount and transaction time.` : `View Robinhood Chain token transfers for ${address}.`,
  };
}

export default async function TokenTransfersPage({ params }: Props) {
  const { address } = await params;
  const snapshot = await getTokenSnapshot(address);
  const token = snapshot?.payload.token;
  if (!token || !snapshot) notFound();
  const transfers = snapshot.payload.transfers;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `${token.name} (${token.symbol}) Token Transfers on Robinhood Chain`,
    description: `Latest token transfer activity for ${token.name} (${token.symbol}) on Robinhood Chain.`,
    url: `/token/${token.address}/transfers`,
  };

  return (
    <div className="token-detail-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <SnapshotNotice fetchedAt={snapshot.fetched_at} />
      <header className="token-subpage-header">
        <div>
          <span>Robinhood Chain token transfers</span>
          <h1>{token.name} ({token.symbol}) Transfers</h1>
          <p>Latest transfer activity with from, to, amount and transaction time.</p>
        </div>
        <Link href={`/token/${token.address}`}>Token overview</Link>
      </header>
      <section className="token-data-panel">
        <div className="token-section-title"><h2>Latest Transfers</h2><span>Indexed by Blockscout</span></div>
        <div className="tokens-table-scroll"><table className="token-data-table"><thead><tr><th>Transaction</th><th>Time</th><th>From</th><th>To</th><th>Amount</th></tr></thead><tbody>
          {transfers.length === 0 && <tr><td colSpan={5} style={{ color: 'var(--muted)', textAlign: 'center', padding: '1.25rem' }}>{snapshot.payload.degraded ? 'Transfer history is temporarily unavailable — the indexer is offline.' : 'No transfers recorded.'}</td></tr>}
          {transfers.map((transfer, index) => <tr key={`${transfer.hash}-${index}`}><td><Link href={`/tx/${transfer.hash}`}>{shortenHash(transfer.hash)}</Link></td><td>{timeAgo(transfer.timestamp)}</td><td><Link href={`/address/${transfer.from}`}>{shortenAddress(transfer.from)}</Link></td><td><Link href={`/address/${transfer.to}`}>{shortenAddress(transfer.to)}</Link></td><td>{formatNumber(transfer.value)} {token.symbol}</td></tr>)}
        </tbody></table></div>
      </section>
    </div>
  );
}
