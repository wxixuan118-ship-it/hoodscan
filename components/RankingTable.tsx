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

function PctDiv({ v }: { v: number | null }) {
  if (v === null) return <div className="dsf-cell muted-cell">—</div>;
  return (
    <div className={`dsf-cell number-cell ${v >= 0 ? 'positive' : 'negative'}`}>
      {fmtPct(v)}
    </div>
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

  const colTemplate = `36px minmax(160px,1.8fr) ${cols.map(() => 'minmax(90px,1fr)').join(' ')} 90px`;
  const dur = `${Math.max(15, tokens.length * 0.85).toFixed(0)}s`;
  const doubled = [...tokens, ...tokens];

  return (
    <div className="dsf-wrap">
      <div className="dsf-head" style={{ gridTemplateColumns: colTemplate }}>
        <div className="dsf-head-cell">#</div>
        <div className="dsf-head-cell">Token</div>
        {cols.map(c => <div key={c} className="dsf-head-cell">{COL_LABELS[c]}</div>)}
        <div className="dsf-head-cell">Contract</div>
      </div>

      <div className="dsf-window" style={{ height: 480 }}>
        <div className="dsf-track" style={{ '--dur': dur } as React.CSSProperties}>
          {doubled.map((token, i) => (
            <div key={`${token.address}-${i}`} className="dsf-row" style={{ gridTemplateColumns: colTemplate }}>
              <div className="dsf-cell rank-cell">{(i % tokens.length) + 1}</div>

              <div className="dsf-cell">
                <Link href={`/token/${token.address}`} className="token-identity">
                  {token.icon_url
                    ? <img className="token-avatar" src={token.icon_url} alt={token.symbol} width={28} height={28} />
                    : <span className="token-avatar">{token.symbol.slice(0, 2)}</span>}
                  <div>
                    <strong>{token.name}</strong>
                    <small>{token.symbol}</small>
                  </div>
                </Link>
              </div>

              {cols.map(col => {
                switch (col) {
                  case 'price':
                    return <div key={col} className="dsf-cell number-cell">{fmtPrice(token.price_usd)}</div>;
                  case 'change':
                    return <PctDiv key={col} v={token.price_change_24h} />;
                  case 'volume':
                    return <div key={col} className="dsf-cell muted-cell number-cell">{fmtUsd(token.volume_24h)}</div>;
                  case 'liquidity':
                    return <div key={col} className="dsf-cell muted-cell number-cell">{fmtUsd(token.liquidity)}</div>;
                  case 'holders':
                    return (
                      <div key={col} className="dsf-cell muted-cell number-cell">
                        {token.holders_count.toLocaleString()}
                      </div>
                    );
                  case 'marketcap':
                    return <div key={col} className="dsf-cell muted-cell number-cell">{fmtUsd(token.market_cap)}</div>;
                  case 'first_seen':
                    return (
                      <div key={col} className="dsf-cell muted-cell" style={{ fontSize: '0.78rem' }}>
                        {new Date(token.first_seen_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </div>
                    );
                  default:
                    return <div key={col} className="dsf-cell">—</div>;
                }
              })}

              <div className="dsf-cell">
                <Link href={`/token/${token.address}`} className="address-cell" style={{ fontSize: '0.75rem' }}>
                  {`${token.address.slice(0, 6)}…${token.address.slice(-4)}`}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
