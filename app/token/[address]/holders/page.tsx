import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatNumber, shortenAddress } from '@/lib/utils';
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
    alternates: { canonical: `${SITE_URL}/token/${address.toLowerCase()}/holders` },
    title: token ? `${token.name} (${token.symbol}) Holders on Robinhood Chain | HoodScan` : 'Robinhood Chain Token Holders | HoodScan',
    description: token ? `View top ${token.symbol} token holders on Robinhood Chain, including wallet addresses, balances and supply percentage.` : `View Robinhood Chain token holders for ${address}.`,
  };
}

export default async function TokenHoldersPage({ params }: Props) {
  const { address } = await params;
  const snapshot = await getTokenSnapshot(address);
  const token = snapshot?.payload.token;
  if (!token || !snapshot) notFound();
  const holders = snapshot.payload.holders;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `${token.name} (${token.symbol}) Token Holders on Robinhood Chain`,
    description: `Top token holders for ${token.name} (${token.symbol}) on Robinhood Chain with balances and supply percentages.`,
    url: `/token/${token.address}/holders`,
  };

  return (
    <div className="token-detail-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <SnapshotNotice fetchedAt={snapshot.fetched_at} />
      <header className="token-subpage-header">
        <div>
          <span>Robinhood Chain token holders</span>
          <h1>{token.name} ({token.symbol}) Holders</h1>
          <p>Top token holders ranked by balance and percentage of total supply.</p>
        </div>
        <Link href={`/token/${token.address}`}>Token overview</Link>
      </header>
      <section className="token-data-panel">
        <div className="token-section-title"><h2>Top Token Holders</h2><span>{token.holders.toLocaleString()} total holders</span></div>
        <div className="tokens-table-scroll"><table className="token-data-table"><thead><tr><th>Rank</th><th>Address</th><th>Balance</th><th>Percentage</th></tr></thead><tbody>
          {holders.map((holder, index) => <tr key={holder.address}><td>{index + 1}</td><td><Link href={`/address/${holder.address}`}>{holder.name || shortenAddress(holder.address, 10)}</Link></td><td>{formatNumber(holder.balance)} {token.symbol}</td><td><div className="holder-share"><span style={{ width: `${Math.min(holder.percentage, 100)}%` }} /> <em>{holder.percentage.toFixed(2)}%</em></div></td></tr>)}
        </tbody></table></div>
      </section>
    </div>
  );
}
