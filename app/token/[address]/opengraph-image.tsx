import { ImageResponse } from 'next/og';
import { getTokenSnapshot } from '@/lib/seo';
export const revalidate = 3600;

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Props = { params: Promise<{ address: string }> };

function fmtPrice(v: number | null): string {
  if (v === null) return '—';
  if (v >= 1) return `$${v.toLocaleString('en-US', { maximumFractionDigits: 4 })}`;
  return `$${v.toFixed(8).replace(/0+$/, '')}`;
}

function fmtPct(v: number | null): string {
  if (v === null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}

export default async function OgImage({ params }: Props) {
  const { address } = await params;

  const token = (await getTokenSnapshot(address))?.payload.token;

  const name    = token?.name    ?? 'Unknown Token';
  const symbol  = token?.symbol  ?? '???';
  const price   = fmtPrice(token?.price ?? null);
  const change  = fmtPct(token?.change24h ?? null);
  const holders = token?.holders ? token.holders.toLocaleString() : '—';
  const isUp    = (token?.change24h ?? 0) >= 0;
  const changeColor = token?.change24h === null ? '#888' : isUp ? '#22c55e' : '#ef4444';

  const shortAddr = `${address.slice(0, 8)}…${address.slice(-6)}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          background: 'linear-gradient(135deg, #0d0d14 0%, #13131f 60%, #1a1025 100%)',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'system-ui, sans-serif',
          padding: '60px 72px',
          position: 'relative',
        }}
      >
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#635bff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff' }}>H</div>
            <span style={{ color: '#635bff', fontWeight: 700, fontSize: 22, letterSpacing: '-0.5px' }}>HoodScan</span>
          </div>
          <span style={{ color: '#555', fontSize: 15 }}>Robinhood Chain · Chain ID 4663</span>
        </div>

        {/* Token identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 40 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#1e1e30', border: '2px solid #2a2a40', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: '#635bff' }}>
              {symbol.slice(0, 2)}
            </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
              <span style={{ fontSize: 48, fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>{name}</span>
              <span style={{ fontSize: 26, fontWeight: 600, color: '#635bff', background: 'rgba(99,91,255,0.12)', borderRadius: 8, padding: '4px 14px' }}>{symbol}</span>
            </div>
            <span style={{ fontSize: 16, color: '#555', fontFamily: 'monospace' }}>{shortAddr}</span>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 'auto' }}>
          {/* Price */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: '24px 28px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ color: '#888', fontSize: 14, fontWeight: 500, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Price</div>
            <div style={{ color: '#fff', fontSize: 34, fontWeight: 700, letterSpacing: '-0.5px' }}>{price}</div>
            <div style={{ color: changeColor, fontSize: 18, fontWeight: 600, marginTop: 6 }}>{`${change} (24h)`}</div>
          </div>
          {/* Holders */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: '24px 28px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ color: '#888', fontSize: 14, fontWeight: 500, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Holders</div>
            <div style={{ color: '#fff', fontSize: 34, fontWeight: 700, letterSpacing: '-0.5px' }}>{holders}</div>
            <div style={{ color: '#555', fontSize: 16, marginTop: 6 }}>unique wallets</div>
          </div>
          {/* Volume */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: '24px 28px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ color: '#888', fontSize: 14, fontWeight: 500, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>24h Volume</div>
            <div style={{ color: '#fff', fontSize: 34, fontWeight: 700, letterSpacing: '-0.5px' }}>
              {token?.volume24h != null
                ? token.volume24h >= 1_000_000 ? `$${(token.volume24h / 1_000_000).toFixed(1)}M`
                : token.volume24h >= 1000 ? `$${(token.volume24h / 1000).toFixed(0)}K`
                : `$${token.volume24h.toFixed(0)}`
                : '—'}
            </div>
            <div style={{ color: '#555', fontSize: 16, marginTop: 6 }}>DEX volume</div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 40, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <span style={{ color: '#444', fontSize: 15 }}>{`hood-chain.com/token/${shortAddr}`}</span>
          <span style={{ color: '#444', fontSize: 15 }}>ERC-20 · Robinhood Chain</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
