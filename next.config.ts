import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' }, // allow all token logo URLs
    ],
  },
  async redirects() {
    return [
      { source: '/stats',       destination: '/analytics/network-stats', permanent: true },
      { source: '/gas-tracker', destination: '/analytics/gas-tracker',   permanent: true },
      { source: '/accounts',    destination: '/analytics/top-accounts',  permanent: true },
      { source: '/dex',         destination: '/analytics/dex-activity',  permanent: true },
    ];
  },
};

export default nextConfig;
