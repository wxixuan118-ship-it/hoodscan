'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function WalletPage() {
  const router = useRouter();
  const [address, setAddress] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = address.trim();
    if (q) router.push(`/address/${q}`);
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '4rem 1.5rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Wallet Tracker</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: 1.6 }}>
        Enter any wallet address on Robinhood Chain to view balances, token holdings, and full transaction history.
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <input
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="0x... wallet address"
          style={{
            flex: 1, minWidth: 260,
            padding: '0.75rem 1rem',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--foreground)',
            fontSize: '0.9rem',
            outline: 'none',
            fontFamily: 'monospace',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: 8,
            background: 'var(--primary)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          Look up
        </button>
      </form>
      <p style={{ color: 'var(--muted)', fontSize: '0.78rem', marginTop: '1rem' }}>
        You can also paste an address directly into the search bar in the header.
      </p>
    </div>
  );
}
