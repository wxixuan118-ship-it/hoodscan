export default function SnapshotNotice({ fetchedAt }: { fetchedAt: string }) {
  return <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
    Data snapshot: {new Date(fetchedAt).toISOString().replace('T', ' ').replace('.000Z', ' UTC')}.
    Balances, prices and activity may have changed since this snapshot.
  </p>;
}
