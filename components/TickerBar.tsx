import { getNetworkSnapshot } from '@/lib/seo';

export default async function TickerBar() {
  const ticker = (await getNetworkSnapshot())?.payload;

  return (
    <div className="ticker-bar">
      <span>
        Chain ID: <strong>4663</strong>
      </span>
      <span className="ticker-sep">|</span>
      <span>
        Gas: <strong>{ticker ? `${ticker.gasPrice} Gwei` : '—'}</strong>
      </span>
      <span className="ticker-sep">|</span>
      <span>
        Network: <strong className="pos">● Live</strong>
      </span>
      <span className="ticker-sep">|</span>
      <span>
        Explorer: <strong>Robinhood Chain Mainnet Token Explorer</strong>
      </span>
    </div>
  );
}
