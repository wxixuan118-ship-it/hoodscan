export default function LoadingTransactions() {
  return (
    <div className="page-shell">
      <div className="page-heading">
        <h1>Transactions</h1>
        <p>Loading latest indexed transactions...</p>
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
