import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatNumber, shortenAddress, shortenHash, timeAgo } from '@/lib/utils';
import { getToken, getTokenTransfers } from '@/lib/blockscout';

type Props = { params: Promise<{ address: string }> };
export const revalidate = 30;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { address } = await params;
  const token = await getToken(address);
  return {
    title: token ? `${token.name} (${token.symbol}) Transfers on Robinhood Chain | HoodScan` : 'Robinhood Chain Token Transfers | HoodScan',
    description: token ? `Track latest ${token.symbol} token transfers on Robinhood Chain, including sender, receiver, amount and transaction time.` : `View Robinhood Chain token transfers for ${address}.`,
  };
}

export default async function TokenTransfersPage({ params }: Props) {
  const { address } = await params;
  const token = await getToken(address);
  if (!token) notFound();
  const transfers = await getTokenTransfers(address, token);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `${token.name} (${token.symbol}) Token Transfers on Robinhood Chain`,
    description: `Latest token transfer activity for ${token.name} (${token.symbol}) on Robinhood Chain.`,
    url: `/token/${token.address}/transfers`,
  };

  return (
    <div className="token-detail-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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
          {transfers.map((transfer, index) => <tr key={`${transfer.hash}-${index}`}><td><Link href={`/tx/${transfer.hash}`}>{shortenHash(transfer.hash)}</Link></td><td>{timeAgo(transfer.timestamp)}</td><td><Link href={`/address/${transfer.from}`}>{shortenAddress(transfer.from)}</Link></td><td><Link href={`/address/${transfer.to}`}>{shortenAddress(transfer.to)}</Link></td><td>{formatNumber(transfer.value)} {token.symbol}</td></tr>)}
        </tbody></table></div>
      </section>
    </div>
  );
}
