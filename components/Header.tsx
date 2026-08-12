'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { isAddress, isHash, isBlockNumber } from '@/lib/utils';

type NavItem = { label: string; href: string; external?: boolean; badge?: string };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Explore',
    items: [
      { label: 'Blocks', href: '/blocks' },
      { label: 'Transactions', href: '/txs' },
      { label: 'Verified Contracts', href: '/contracts' },
    ],
  },
  {
    label: 'Tokens',
    items: [
      { label: 'All Tokens', href: '/tokens' },
      { label: 'Trending', href: '/tokens/trending' },
      { label: 'New Tokens', href: '/tokens/new' },
      { label: 'Top Gainers', href: '/tokens/top-gainers' },
      { label: 'Most Traded', href: '/tokens/most-traded' },
      { label: 'Most Held', href: '/tokens/most-held' },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { label: 'Network Stats', href: '/stats' },
      { label: 'Gas Tracker', href: '/gas-tracker' },
      { label: 'Top Accounts', href: '/accounts' },
      { label: 'DEX Activity', href: '/dex' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { label: 'About HoodScan', href: '/about' },
      { label: 'Add Network', href: 'https://docs.robinhood.com/chain/add-network-to-wallet/', external: true },
      { label: 'Bridge Guide', href: 'https://docs.robinhood.com/', external: true },
      { label: 'Developer Docs', href: 'https://docs.robinhood.com/chain/', external: true },
    ],
  },
];

const MAX_RECENT = 5;

function detectQueryType(q: string): string | null {
  if (!q) return null;
  if (isAddress(q)) return 'Address';
  if (isHash(q)) return 'Tx Hash';
  if (isBlockNumber(q)) return 'Block';
  return 'Token';
}

function navigateQuery(q: string, router: ReturnType<typeof useRouter>) {
  if (isAddress(q)) router.push(`/address/${q}`);
  else if (isHash(q)) router.push(`/tx/${q}`);
  else if (isBlockNumber(q)) router.push(`/blocks?highlight=${q}`);
  else router.push(`/tokens?search=${encodeURIComponent(q)}`);
}

const ExternalIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--muted)', flexShrink: 0 }}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    style={{ transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const Badge = ({ label }: { label: string }) => (
  <span style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem', borderRadius: 999, background: 'rgba(255,79,46,.15)', color: 'var(--primary)', fontWeight: 600, flexShrink: 0 }}>{label}</span>
);

const dropdownItemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '0.5rem 1rem', fontSize: '0.82rem', color: 'var(--foreground)',
  textDecoration: 'none', gap: '0.5rem', background: 'none', border: 'none',
  cursor: 'pointer', width: '100%', textAlign: 'left',
};

export default function Header() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('hs_recent');
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch {}
  }, []);

  const saveRecent = useCallback((q: string) => {
    setRecentSearches(prev => {
      const updated = [q, ...prev.filter(item => item !== q)].slice(0, MAX_RECENT);
      try { localStorage.setItem('hs_recent', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  // Close search dropdown on outside click
  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    saveRecent(q);
    setSearchFocused(false);
    setQuery('');
    navigateQuery(q, router);
  }

  function handleRecentClick(q: string) {
    setSearchFocused(false);
    navigateQuery(q, router);
  }

  function openNav(label: string) {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setOpenGroup(label);
  }

  function closeNav() {
    closeTimerRef.current = setTimeout(() => setOpenGroup(null), 300);
  }

  const detectedType = detectQueryType(query.trim());
  const filteredRecent = recentSearches.filter(s => !query || s.toLowerCase().includes(query.toLowerCase()));
  const showSearchDropdown = searchFocused && (filteredRecent.length > 0 || query.length > 1);

  return (
    <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'static' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', height: 64 }}>

        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, background: 'var(--primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#fff' }}>HS</div>
          <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--foreground)' }}>HoodScan</span>
        </Link>

        {/* Search */}
        <div ref={searchRef} style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center',
              background: 'var(--surface-2)',
              border: `1px solid ${searchFocused ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: 8, padding: '0 0.875rem', gap: '0.5rem', transition: 'border-color .15s',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--muted)', flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="Search address, tx hash, block, token…"
                style={{ flex: 1, padding: '0.5rem 0', background: 'transparent', border: 'none', color: 'var(--foreground)', fontSize: '0.875rem', outline: 'none', minWidth: 0 }}
              />
              {detectedType && query && (
                <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: 999, background: 'rgba(255,79,46,.15)', color: 'var(--primary)', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {detectedType}
                </span>
              )}
            </div>
            <button type="submit" style={{ padding: '0.5rem 1rem', borderRadius: 8, background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, flexShrink: 0 }}>
              Search
            </button>
          </form>

          {/* Search dropdown */}
          {showSearchDropdown && (
            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 8px 28px rgba(0,0,0,.45)', zIndex: 9999, overflow: 'hidden' }}>
              {filteredRecent.length > 0 && (
                <>
                  <div style={{ padding: '0.45rem 0.875rem', fontSize: '0.68rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' }}>
                    Recent searches
                  </div>
                  {filteredRecent.map(s => (
                    <button key={s} onClick={() => handleRecentClick(s)}
                      style={{ width: '100%', textAlign: 'left', padding: '0.55rem 0.875rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--foreground)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--muted)', flexShrink: 0 }}>
                        <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.08"/>
                      </svg>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s}</span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--muted)', flexShrink: 0 }}>
                        {detectQueryType(s) || 'Token'}
                      </span>
                    </button>
                  ))}
                </>
              )}
              {query && filteredRecent.length === 0 && (
                <div style={{ padding: '0.75rem 0.875rem', fontSize: '0.82rem', color: 'var(--muted)' }}>
                  Press Enter to search for &ldquo;{query}&rdquo;
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop nav — CSS-only hover dropdowns */}
        <nav className="hs-desktop-nav" style={{ display: 'flex', gap: '0.1rem', flexShrink: 0 }}>
          {NAV_GROUPS.map(group => (
            <div key={group.label} className="hs-nav-group">
              <button className="hs-nav-btn">
                {group.label}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              <div className="hs-nav-dropdown">
                  {group.items.map(item => (
                    item.external ? (
                      <a key={item.href} href={item.href} target="_blank" rel="noreferrer" className="hs-nav-item">
                        <span>{item.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          {item.badge && <Badge label={item.badge} />}
                          <ExternalIcon />
                        </div>
                      </a>
                    ) : (
                      <Link key={item.href} href={item.href} className="hs-nav-item">
                        <span>{item.label}</span>
                        {item.badge && <Badge label={item.badge} />}
                      </Link>
                    )
                  ))}
                </div>
            </div>
          ))}
        </nav>

        {/* Network status + Connect Wallet */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <div
            title="Robinhood Chain · Chain ID 4663 · EVM-compatible L2"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.65rem', borderRadius: 20, border: '1px solid var(--border)', fontSize: '0.72rem', color: 'var(--muted)', whiteSpace: 'nowrap', cursor: 'default' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
            Mainnet · Live
          </div>
          <Link href="/wallet"
            style={{ padding: '0.375rem 0.75rem', borderRadius: 8, background: 'var(--surface-2)', color: 'var(--foreground)', border: '1px solid var(--border)', fontSize: '0.8rem', fontWeight: 500, whiteSpace: 'nowrap', textDecoration: 'none' }}>
            My Wallet
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="hs-mobile-menu-btn"
          onClick={() => setMobileOpen(prev => !prev)}
          style={{ padding: '0.375rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--foreground)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileOpen
              ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
              : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
          </svg>
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="hs-mobile-nav" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '0.5rem 1.5rem 1rem' }}>
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '0.75rem 0 0.3rem', fontWeight: 600 }}>
                {group.label}
              </div>
              {group.items.map(item => (
                item.external ? (
                  <a key={item.href} href={item.href} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', fontSize: '0.875rem', color: 'var(--foreground)', borderBottom: '1px solid var(--border)' }}
                    onClick={() => setMobileOpen(false)}>
                    {item.label}
                    {item.badge ? <Badge label={item.badge} /> : <ExternalIcon />}
                  </a>
                ) : (
                  <Link key={item.href} href={item.href}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', fontSize: '0.875rem', color: 'var(--foreground)', borderBottom: '1px solid var(--border)' }}
                    onClick={() => setMobileOpen(false)}>
                    {item.label}
                    {item.badge && <Badge label={item.badge} />}
                  </Link>
                )
              ))}
            </div>
          ))}
        </nav>
      )}
    </header>
  );
}
