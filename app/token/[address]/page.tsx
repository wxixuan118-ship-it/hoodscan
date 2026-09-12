import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatNumber, shortenAddress, shortenHash, timeAgo } from '@/lib/utils';
import { formatTokenAmount } from '@/lib/blockscout';
import { getTokenSnapshot, SITE_URL } from '@/lib/seo';
import SnapshotNotice from '@/components/SnapshotNotice';
import { type TokenRiskReport } from '@/lib/token-risk';

type Props = { params: Promise<{ address: string }> };
export const revalidate = 3600;
export async function generateStaticParams() { return []; }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { address } = await params;
  const snapshot = await getTokenSnapshot(address);
  const token = snapshot?.payload.token;
  return {
    alternates: { canonical: `${SITE_URL}/token/${address.toLowerCase()}` },
    robots: { index: snapshot?.indexable ?? false, follow: true },
    title: token
      ? `${token.name} (${token.symbol}) on Robinhood Chain`
      : 'Token Not Found | HoodScan',
    description: token
      ? `${token.name} (${token.symbol}) — price, holders, transfers, liquidity and contract details on Robinhood Chain. ${token.holders.toLocaleString()} holders.`
      : `Token data for ${address} on Robinhood Chain.`,
    openGraph: token ? {
      title: `${token.name} (${token.symbol}) | HoodScan`,
      description: `Track ${token.symbol} on Robinhood Chain: price, ${token.holders.toLocaleString()} holders, transfers and contract info.`,
    } : undefined,
  };
}

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="token-detail-row"><dt>{label}</dt><dd>{value}</dd></div>
);

const money = (value: number | null) =>
  value === null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 }).format(value);

const riskClass = (status: string) =>
  status === 'fail' ? 'danger' : status === 'warn' ? 'warning' : status === 'pass' ? 'success' : 'unknown';

function RiskPanel({ risk }: { risk: TokenRiskReport }) {
  return (
    <section className="risk-terminal">
      <div className="risk-hero">
        <div>
          <span className="risk-kicker">Token risk scanner</span>
          <h2>{risk.level} Risk</h2>
          <p>Checks holder concentration, proxy upgradability, mint permissions, blacklist, pause function, liquidity depth and transfer tax.</p>
        </div>
        <div className={`risk-score ${risk.level.toLowerCase()}`}>
          <strong>{risk.score}</strong>
          <span>/ 100</span>
        </div>
      </div>
      <div className="risk-metrics">
        <div><span>Top 1 holder</span><strong>{risk.concentration.top1.toFixed(2)}%</strong></div>
        <div><span>Top 5 holders</span><strong>{risk.concentration.top5.toFixed(2)}%</strong></div>
        <div><span>Top 10 holders</span><strong>{risk.concentration.top10.toFixed(2)}%</strong></div>
      </div>
      <div className="risk-checks">
        {risk.checks.map(check => (
          <article key={check.key} className="risk-check">
            <div className="risk-check-top">
              <span className={`risk-dot ${riskClass(check.status)}`} />
              <strong>{check.label}</strong>
              <em className={riskClass(check.status)}>{check.status}</em>
            </div>
            <p>{check.summary}</p>
            <small>{check.evidence}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

export default async function TokenPage({ params }: Props) {
  const { address } = await params;
  const snapshot = await getTokenSnapshot(address);
  if (!snapshot) notFound();
  const { token, holders, transfers, contract, risk } = snapshot.payload;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'HoodScan', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Tokens', item: `${SITE_URL}/tokens` },
      { '@type': 'ListItem', position: 3, name: token.name, item: `${SITE_URL}/token/${token.address}` },
    ],
  };

  return (
    <div className="token-detail-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      {/* Breadcrumb */}
      <nav style={{ marginBottom: '1.25rem', fontSize: '0.78rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
        <Link href="/" style={{ color: 'var(--muted)' }}>Home</Link>
        <span>›</span>
        <Link href="/tokens" style={{ color: 'var(--muted)' }}>Tokens</Link>
        <span>›</span>
        <span style={{ color: 'var(--foreground)' }}>{token.name}</span>
      </nav>

      {/* Header */}
      <header className="token-detail-header">
        {token.iconUrl
          ? <img src={token.iconUrl} alt="" className="token-detail-icon" width={48} height={48} />
          : <span className="token-detail-icon fallback">{token.symbol.slice(0, 2)}</span>}
        <div>
          <h1>{token.name} <span>({token.symbol})</span></h1>
          <div className="token-contract">
            <code>{token.address}</code>
            <span>{token.type}</span>
            {contract.verified && <em>✓ Contract verified</em>}
          </div>
        </div>
      </header>

      <SnapshotNotice fetchedAt={snapshot.fetched_at} />
      <p>{token.name} ({token.symbol}) is a {token.type} token on Robinhood Chain with {token.holders.toLocaleString()} holders. Recorded liquidity: {money(token.liquidity)}. Contract verification: {contract.verified ? 'verified' : 'not verified'}.</p>

      {/* Price chart — GeckoTerminal embed */}
      {token.poolAddress && (
        <div style={{ marginBottom: '1.25rem', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: 'var(--surface)' }}>
          <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{token.symbol} / USD — Price Chart</span>
            <a href={`https://www.geckoterminal.com/robinhood/pools/${token.poolAddress}`} target="_blank" rel="noreferrer"
              style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              View on GeckoTerminal ↗
            </a>
          </div>
          <iframe
            src={`https://www.geckoterminal.com/robinhood/pools/${token.poolAddress}?embed=1&info=0&swaps=0&chart=1`}
            style={{ width: '100%', height: 360, border: 'none', display: 'block' }}
            title={`${token.symbol} price chart`}
            loading="lazy"
            allow="clipboard-write"
          />
        </div>
      )}

      {/* Quick links */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[
          { label: `Holders (${token.holders.toLocaleString()})`, href: `/token/${token.address}/holders` },
          { label: 'Transfers', href: `/token/${token.address}/transfers` },
          token.poolAddress ? { label: 'Chart on GeckoTerminal', href: `https://www.geckoterminal.com/robinhood/pools/${token.poolAddress}`, external: true } : null,
        ].filter(Boolean).map(link => link && (
          link.external ? (
            <a key={link.href} href={link.href} target="_blank" rel="noreferrer"
              style={{ padding: '0.4rem 0.85rem', borderRadius: 7, border: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--muted)', textDecoration: 'none' }}>
              {link.label} ↗
            </a>
          ) : (
            <Link key={link.href} href={link.href}
              style={{ padding: '0.4rem 0.85rem', borderRadius: 7, border: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--muted)', textDecoration: 'none' }}>
              {link.label}
            </Link>
          )
        ))}
      </div>

      {/* Overview grid */}
      <div className="token-overview-grid">
        <section className="token-panel">
          <h2>Market data</h2>
          <dl>
            <Row label="Price" value={token.price ? `$${token.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: token.price >= 1 ? 4 : 8 })}` : '—'} />
            <Row label="24h change" value={token.change24h === null ? '—' :
              <span className={token.change24h >= 0 ? 'positive' : 'negative'}>
                {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
              </span>} />
            <Row label="Market cap" value={money(token.marketCap)} />
            <Row label="24h volume" value={money(token.volume24h)} />
            <Row label="Liquidity" value={money(token.liquidity)} />
            <Row label="Total supply" value={`${formatNumber(formatTokenAmount(token.totalSupply, token.decimals, 2))} ${token.symbol}`} />
            <Row label="Holders" value={token.holders.toLocaleString()} />
            <Row label="Decimals" value={token.decimals} />
          </dl>
        </section>

        <section className="token-panel">
          <h2>Contract</h2>
          <dl>
            <Row label="Contract verified" value={contract.verified ? <span className="positive">Yes — source on Blockscout</span> : <span style={{ color: 'var(--warning)' }}>Not verified</span>} />
            {contract.proxyType && <Row label="Proxy type" value={<span style={{ color: 'var(--warning)' }}>{contract.proxyType}</span>} />}
            <Row label="Creator" value={contract.creator ? <Link href={`/address/${contract.creator}`}>{shortenAddress(contract.creator, 8)}</Link> : '—'} />
            <Row label="Creation tx" value={contract.creationTx ? <Link href={`/tx/${contract.creationTx}`}>{shortenHash(contract.creationTx)}</Link> : '—'} />
            <Row label="Token reputation" value={token.reputation} />
            <Row label="Price source" value={token.priceSource} />
            <Row label="Indexer" value="Blockscout v2" />
            {token.dex && <Row label="Primary DEX" value={token.dex} />}
          </dl>
        </section>
      </div>

      {/* Risk panel */}
      {risk && <RiskPanel risk={risk} />}

      {/* Top holders */}
      <section className="token-data-panel">
        <div className="token-section-title">
          <h2>Top holders</h2>
          <span>
            {token.holders.toLocaleString()} total ·{' '}
            <Link href={`/token/${token.address}/holders`} style={{ fontSize: '0.75rem' }}>View all</Link>
          </span>
        </div>
        <div className="tokens-table-scroll">
          <table className="token-data-table">
            <thead><tr><th>#</th><th>Wallet</th><th>Balance</th><th>Share</th></tr></thead>
            <tbody>
              {holders.map((holder, index) => (
                <tr key={holder.address}>
                  <td>{index + 1}</td>
                  <td><Link href={`/address/${holder.address}`}>{holder.name || shortenAddress(holder.address, 10)}</Link></td>
                  <td>{formatNumber(holder.balance)} {token.symbol}</td>
                  <td>
                    <div className="holder-share">
                      <span style={{ width: `${Math.min(holder.percentage, 100)}%` }} />
                      <em>{holder.percentage.toFixed(2)}%</em>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent transfers */}
      <section className="token-data-panel">
        <div className="token-section-title">
          <h2>Recent transfers</h2>
          <span>
            <Link href={`/token/${token.address}/transfers`} style={{ fontSize: '0.75rem' }}>View all</Link>
          </span>
        </div>
        <div className="tokens-table-scroll">
          <table className="token-data-table">
            <thead><tr><th>Transaction</th><th>Age</th><th>Method</th><th>From</th><th>To</th><th>Amount</th></tr></thead>
            <tbody>
              {transfers.map((transfer, index) => (
                <tr key={`${transfer.hash}-${index}`}>
                  <td><Link href={`/tx/${transfer.hash}`}>{shortenHash(transfer.hash)}</Link></td>
                  <td>{timeAgo(transfer.timestamp)}</td>
                  <td>{transfer.method || 'Transfer'}</td>
                  <td><Link href={`/address/${transfer.from}`}>{shortenAddress(transfer.from)}</Link></td>
                  <td><Link href={`/address/${transfer.to}`}>{shortenAddress(transfer.to)}</Link></td>
                  <td>{formatNumber(transfer.value)} {token.symbol}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
