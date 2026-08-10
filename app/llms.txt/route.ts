import { getTrendingTokens } from '@/lib/db';

const BASE = 'https://www.hood-chain.com';

export async function GET() {
  const trending = await getTrendingTokens(10);

  const tokenLines = trending.length
    ? trending.map(t => `- [${t.name} (${t.symbol})](${BASE}/token/${t.address}): trending on Robinhood Chain`).join('\n')
    : '- (live token rankings load from the site once on-chain data is indexed)';

  const body = `# HoodScan

> AI-powered blockchain explorer for Robinhood Chain. Track tokens, wallets, and transactions.

## Docs
- [About](${BASE}/about): what HoodScan is and how it indexes Robinhood Chain
- [Network stats](${BASE}/stats): daily transaction, address, and gas activity

## Explorer
- [Latest blocks](${BASE}/blocks): block height, gas usage, miner
- [Latest transactions](${BASE}/txs): transaction status and gas fees
- [Gas tracker](${BASE}/gas-tracker): current gas price
- [DEX overview](${BASE}/dex): decentralized exchanges and liquidity pools

## Tokens
- [All tokens](${BASE}/tokens): every ERC-20 token on Robinhood Chain
- [Trending](${BASE}/tokens/trending)
- [New](${BASE}/tokens/new)
- [Top gainers](${BASE}/tokens/top-gainers)
- [Most traded](${BASE}/tokens/most-traded)
- [Most held](${BASE}/tokens/most-held)

## Trending tokens
${tokenLines}
`;

  return new Response(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
