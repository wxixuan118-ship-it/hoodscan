import Link from 'next/link';
import type { DbToken } from '@/lib/db-client';
import { fmtUsd, fmtPct, fmtPrice } from '@/lib/db';

type Col = 'price' | 'change' | 'volume' | 'liquidity' | 'holders' | 'marketcap' | 'first_seen';

type Props = {
  tokens: DbToken[];
  cols?: Col[];
  emptyMessage?: string;
};

const DEFAULT_COLS: Col[] = ['price', 'change', 'volume', 'liquidity', 'holders'];

const COL_LABELS: Record<Col, string> = {
  price:      'Price',
  change:     '24h %',
  volume:     '24h Vol',
  liquidity:  'Liquidity',
  holders:    'Holders',
  marketcap:  'Market Cap',
  first_seen: 'Listed',
};

function PctCell({ v }: { v: number | null }) {
  if (v === null) return <td className="muted-cell">—</td>;
  return (
    <td className={v >= 0 ? 'positive number-cell' : 'negative number-cell'}>
      {fmtPct(v)}
    </td>
  );
}

export default function RankingTable({ tokens, cols = DEFAULT_COLS, emptyMessage }: Props) {
  if (!tokens.length) {
    return (
      <div className="tokens-empty">
        {emptyMessage ?? 'No data yet — sync is running. Check back in a few minutes.'}
      </div>
    );
  }

  return (
    <div className="tokens-table-shell">
      <div className="tokens-table-scroll">
        <table className="tokens-market-table" style={{ minWidth: 700 }}>
          <thead>
            <tr>
              <th style={{ width: 36 }}>#</th>
              <th>Token</th>
              {cols.map(c => <th key={c}>{COL_LABELS[c]}</th>)}
              <th>Contract</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((token, i) => (
              <tr key={token.address}>
                <td className="rank-cell">{i + 1}</td>

                {/* Token identity */}
                <td>
                  <Link href={`/token/${token.address}`} className="token-identity">
                    {token.icon_url
                      ? <img className="token-avatar" src={token.icon_url} alt={token.symbol} width={30} height={30} />
                      : <span className="token-avatar">{token.symbol.slice(0, 2)}</span>}
                    <div>
                      <strong>{token.name}</strong>
                      <small>{token.symbol}</small>
                    </div>
                  </Link>
                </td>

                {/* Dynamic columns */}
                {cols.map(col => {
                  switch (col) {
                    case 'price':
                      return <td key={col} className="number-cell">{fmtPrice(token.price_usd)}</td>;
                    case 'change':
                      return <PctCell key={col} v={token.price_change_24h} />;
                    case 'volume':
                      return <td key={col} className="muted-cell number-cell">{fmtUsd(token.volume_24h)}</td>;
                    case 'liquidity':
                      return <td key={col} className="muted-cell number-cell">{fmtUsd(token.liquidity)}</td>;
                    case 'holders':
                      return (
                        <td key={col} className="muted-cell number-cell">
                          {token.holders_count.toLocaleString()}
                        </td>
                      );
                    case 'marketcap':
                      return <td key={col} className="muted-cell number-cell">{fmtUsd(token.market_cap)}</td>;
                    case 'first_seen':
                      return (
                        <td key={col} className="muted-cell" style={{ fontSize: '0.78rem' }}>
                          {new Date(token.first_seen_at).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </td>
                      );
                    default:
                      return <td key={col}>—</td>;
                  }
                })}

                {/* Contract link */}
                <td>
                  <Link href={`/token/${token.address}`} className="address-cell" style={{ fontSize: '0.75rem' }}>
                    {`${token.address.slice(0, 6)}…${token.address.slice(-4)}`}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
