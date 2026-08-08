# HoodScan — Robinhood Chain Explorer

> AI-powered blockchain explorer for Robinhood Chain. Track tokens, wallets, and transactions.

## Pages

| Route | Description |
|---|---|
| `/` | Homepage — network stats, latest blocks/txs, popular tokens |
| `/blocks` | Block list with gas usage bars |
| `/txs` | Transaction list with status and gas fee |
| `/tokens` | All ERC-20 tokens on Robinhood Chain |
| `/token/[address]` | Token detail — holders, transfers, AI Risk Summary |
| `/address/[address]` | Wallet tracker — balance, token holdings, tx history |
| `/tx/[hash]` | Transaction detail |
| `/about` | About page |
| `/sitemap.xml` | Auto-generated sitemap for SEO |
| `/robots.txt` | robots.txt |

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS** (inline CSS variables for dark theme)
- Mock data in `lib/mock-data.ts` — swap for real RPC/Blockscout API calls
- AI Risk Summary via rule engine in `lib/utils.ts` (no LLM needed)

## Local Development

```bash
cd hoodscan
npm install
npm run dev
```

Open http://localhost:3000

## Connecting Real Data

Edit `lib/mock-data.ts` and replace the mock arrays with real API calls:

```ts
// Example: fetch latest blocks from Robinhood Chain RPC
const res = await fetch('https://rpc.robinhoodchain.io', {
  method: 'POST',
  body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getBlockByNumber', params: ['latest', true], id: 1 }),
});
```

Or wire up Blockscout API:
```
GET https://blockscout.robinhoodchain.io/api/v2/tokens
GET https://blockscout.robinhoodchain.io/api/v2/transactions
```

## Deploy

### Vercel (recommended)

```bash
npm i -g vercel
vercel --prod
```

Set environment variables in Vercel dashboard:
```
NEXT_PUBLIC_RPC_URL=https://rpc.robinhoodchain.io
NEXT_PUBLIC_CHAIN_ID=<chain_id>
```

### Self-hosted

```bash
npm run build
npm start
```

## SEO

- Dynamic `<title>` and `<meta description>` on every page
- `/sitemap.xml` auto-generated from all token and tx pages
- `/robots.txt` allows all crawlers
- Target keywords: `Robinhood Chain Explorer`, `Robinhood Chain Tokens`, `Robinhood Chain Wallet Tracker`

## Project Structure

```
hoodscan/
├── app/
│   ├── page.tsx              # Homepage
│   ├── layout.tsx            # Root layout (Header + Footer)
│   ├── globals.css           # Dark theme CSS variables
│   ├── sitemap.ts            # Auto sitemap
│   ├── robots.ts             # robots.txt
│   ├── blocks/page.tsx
│   ├── txs/page.tsx
│   ├── tokens/page.tsx
│   ├── token/[address]/page.tsx
│   ├── address/[address]/page.tsx
│   ├── tx/[hash]/page.tsx
│   └── about/page.tsx
├── components/
│   ├── Header.tsx            # Nav + search bar
│   └── Footer.tsx
└── lib/
    ├── mock-data.ts          # Replace with real API
    └── utils.ts              # Formatters + AI risk engine
```
