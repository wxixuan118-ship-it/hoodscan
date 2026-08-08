import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TickerBar from '@/components/TickerBar';

export const metadata: Metadata = {
  title: {
    default: 'HoodScan | Robinhood Chain Explorer',
    template: '%s | HoodScan',
  },
  description: 'Explore tokens, wallets, transactions and blockchain activity on Robinhood Chain. The AI-powered Robinhood Chain Explorer.',
  keywords: ['Robinhood Chain', 'Robinhood Chain Explorer', 'Robinhood Chain Tokens', 'Robinhood Chain Wallet Tracker', 'HoodScan', 'blockchain explorer'],
  openGraph: {
    title: 'HoodScan | Robinhood Chain Explorer',
    description: 'Explore tokens, wallets, transactions and blockchain activity on Robinhood Chain.',
    type: 'website',
    siteName: 'HoodScan',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HoodScan | Robinhood Chain Explorer',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1 },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="yandex-verification" content="71887051e7cc28c8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <TickerBar />
        <main style={{ flex: 1 }}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
