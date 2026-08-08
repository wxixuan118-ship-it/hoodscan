export default function LoadingTokens() {
  return (
    <div className="tokens-page">
      <div className="tokens-heading">
        <div>
          <h1>Tokens</h1>
          <p>Loading live token markets...</p>
        </div>
        <span className="tokens-api-badge">Live</span>
      </div>
      <div className="tokens-tabs">
        <span className="skeleton-pill" />
        <span className="skeleton-pill wide" />
      </div>
      <div className="tokens-table-shell">
        {Array.from({ length: 9 }).map((_, index) => (
          <div className="skeleton-row" key={index}>
            <span className="skeleton-avatar" />
            <span className="skeleton-line strong" />
            <span className="skeleton-line" />
            <span className="skeleton-line short" />
          </div>
        ))}
      </div>
    </div>
  );
}
