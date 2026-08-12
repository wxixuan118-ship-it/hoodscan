// Ticker bar showing ETH price, gas price, chain stats — like robinscan.io top bar
// Data is fetched server-side; graceful fallback if unavailable.

async function fetchTickerData() {
  try {
    const rpcUrl = process.env.ROBINHOOD_RPC_URL || 'https://rpc.mainnet.chain.robinhood.com';
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_gasPrice', params: [] }),
      next: { revalidate: 12 },
      signal: AbortSignal.timeout(4_000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { result?: string };
    if (!data.result) return null;
    const gasPriceGwei = (parseInt(data.result, 16) / 1e9).toFixed(4);
    return { gasPrice: gasPriceGwei };
  } catch {
    return null;
  }
}

export default async function TickerBar() {
  const ticker = await fetchTickerData();

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
