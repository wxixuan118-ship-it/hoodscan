'use client';

import { usePathname } from 'next/navigation';

/** Directory badge for the homepage footer only. Not rendered on other routes. */
export default function HomepageFooterBadge() {
  const pathname = usePathname();
  if (pathname !== '/') return null;

  return (
    <a href="https://www.launchvault.dev" target="_blank" title="Feature On Launch Vault">
      {/* External badge asset; keep the provided <img> markup. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://www.launchvault.dev/images/badges/launch-valut-badge.svg"
        alt="Feature On Launch Vault"
        style={{ width: '195px', height: 'auto' }}
      />
    </a>
  );
}
