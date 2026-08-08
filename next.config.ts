import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' }, // allow all token logo URLs
    ],
  },
};

export default nextConfig;
