export default function LoadingBlocks() {
  return (
    <div className="page-shell">
      <div className="page-heading">
        <h1>Blocks</h1>
        <p>Loading latest RPC blocks...</p>
      </div>
      <div className="tokens-table-shell">
        {Array.from({ length: 10 }).map((_, index) => (
          <div className="skeleton-row" key={index}>
            <span className="skeleton-line strong" />
            <span className="skeleton-line" />
            <span className="skeleton-line short" />
          </div>
        ))}
      </div>
    </div>
  );
}
