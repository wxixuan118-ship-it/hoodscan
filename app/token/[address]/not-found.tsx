export default function TokenNotFound() {
  return <div className="token-detail-page"><h1>Token snapshot not available</h1>
    <p>This token has not been published in the snapshot directory.</p>
    <a href="https://robinhoodchain.blockscout.com/tokens">Browse live token data on Blockscout ↗</a>
  </div>;
}
