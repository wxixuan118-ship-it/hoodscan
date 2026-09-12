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
- `/sitemap.xml` lists only successfully snapshotted, indexable token/address pages with a trustworthy `lastmod`
- `/robots.txt` disallows per-block/tx pages (crawl-cost protection); `proxy.ts` also returns 403 to known crawler UAs on those routes
- Target keywords: `Robinhood Chain Explorer`, `Robinhood Chain Tokens`, `Robinhood Chain Wallet Tracker`

### Bounded pSEO snapshots (token / address pages)

`/token/[address]` and `/address/[address]` (plus holders/transfers sub-pages and the token OG image) render **only from PostgreSQL snapshots** — no upstream Blockscout/RPC calls happen on the request path. Pages use 1-hour ISR.

- `db/migrations/001-seo-snapshots.sql` — `seo_snapshots` table (run once with `psql -v ON_ERROR_STOP=1 -f`)
- `scripts/snapshot.ts` / `npm run snapshot` — hourly job (`.github/workflows/snapshot.yml`) that refreshes up to 300 tokens + 500 related addresses in small batches, with an advisory lock and a soft 10-minute budget
- `proxy.ts` — validates addresses, 308-redirects to lowercase canonical, and returns a lightweight `noindex`/`no-store` response for unpublished keys so misses never create ISR entries
- `lib/seo.ts`, `lib/seo-registry.ts`, `lib/snapshot-store.ts` — snapshot read/write helpers and the published-route directory

See [docs/pseo-plan.md](docs/pseo-plan.md) for the rollout order, budgets, and Cloudflare notes.

### Tests

```bash
npm run test:seo         # unit tests on an isolated PGlite database
npm run build
npm run test:seo:smoke   # production server against DB fixtures; asserts ISR HIT, zero upstream calls, noindex, sitemap membership (uses port 34817)
```

The smoke test writes to the local `.next` cache — always rebuild before deploying.

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
