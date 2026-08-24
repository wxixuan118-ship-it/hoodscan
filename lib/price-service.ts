import type { IndexedToken } from './blockscout';
import { withCircuitBreaker } from './circuit-breaker';

const BASE_URL = process.env.GECKOTERMINAL_API_URL || 'https://api.geckoterminal.com/api/v2';
const NETWORK = 'robinhood';

type JsonApiItem = { id: string; attributes: Record<string, any>; relationships?: Record<string, { data: Array<{ id: string }> | { id: string } | null }> };
export type PricedToken = IndexedToken & { change24h: number | null; liquidity: number | null; sparkline: number[]; dex: string | null; priceSource: 'GeckoTerminal' | 'Blockscout'; poolAddress: string | null };

// Shares the 'geckoterminal' breaker key with lib/api-direct.ts's gtFetch — same
// upstream host, so failures from either path count toward the same trip/cooldown.
async function request<T>(path: string, revalidate = 300): Promise<T> {
  return withCircuitBreaker('geckoterminal', async () => {
    const response = await fetch(`${BASE_URL}${path}`, { headers: { accept: 'application/json' }, next: { revalidate }, signal: AbortSignal.timeout(6_000) });
    if (!response.ok) throw new Error(`GeckoTerminal returned HTTP ${response.status}`);
    return response.json() as Promise<T>;
  });
}

const chunks = <T,>(items: T[], size: number) => Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, index * size + size));
const numberOrNull = (value: unknown) => value === null || value === undefined || value === '' ? null : Number(value);
const poolAddress = (id: string) => id.replace(`${NETWORK}_`, '');

export async function getTokenPrices(tokens: IndexedToken[]): Promise<PricedToken[]> {
  const limited = tokens.slice(0, 20);
  const fallback = limited.map(token => ({ ...token, change24h: null, liquidity: null, sparkline: [], dex: null, priceSource: 'Blockscout' as const, poolAddress: null }));
  if (!limited.length) return fallback;

  try {
    const tokenResponses = await Promise.all(chunks(limited, 30).map(group => request<{ data: JsonApiItem[] }>(`/networks/${NETWORK}/tokens/multi/${group.map(token => token.address).join(',')}`)));
    const tokenItems = tokenResponses.flatMap(response => response.data);
    const tokenByAddress = new Map(tokenItems.map(item => [String(item.attributes.address).toLowerCase(), item]));
    const pools = tokenItems.map(item => {
      const data = item.relationships?.top_pools?.data;
      return Array.isArray(data) && data[0] ? poolAddress(data[0].id) : null;
    }).filter((value): value is string => Boolean(value));

    const poolResponses = pools.length ? await Promise.all(chunks(pools, 30).map(group => request<{ data: JsonApiItem[]; included?: JsonApiItem[] }>(`/networks/${NETWORK}/pools/multi/${group.join(',')}?include=dex`))) : [];
    const poolItems = poolResponses.flatMap(response => response.data);
    const included = poolResponses.flatMap(response => response.included || []);
    const dexNames = new Map(included.map(item => [item.id, String(item.attributes.name || item.id)]));
    const poolByAddress = new Map(poolItems.map(item => [String(item.attributes.address).toLowerCase(), item]));

    const enriched = limited.map(token => {
      const tokenItem = tokenByAddress.get(token.address.toLowerCase());
      const relation = tokenItem?.relationships?.top_pools?.data;
      const poolId = Array.isArray(relation) && relation[0] ? poolAddress(relation[0].id).toLowerCase() : null;
      const pool = poolId ? poolByAddress.get(poolId) : undefined;
      const dexRelation = pool?.relationships?.dex?.data;
      const dexId = dexRelation && !Array.isArray(dexRelation) ? dexRelation.id : null;
      return {
        ...token,
        price: numberOrNull(tokenItem?.attributes.price_usd) ?? token.price,
        marketCap: numberOrNull(tokenItem?.attributes.market_cap_usd) ?? token.marketCap,
        volume24h: numberOrNull(tokenItem?.attributes.volume_usd?.h24) ?? token.volume24h,
        liquidity: numberOrNull(pool?.attributes.reserve_in_usd) ?? numberOrNull(tokenItem?.attributes.total_reserve_in_usd),
        change24h: numberOrNull(pool?.attributes.price_change_percentage?.h24),
        dex: dexId ? dexNames.get(dexId) || dexId : null,
        sparkline: [] as number[], poolAddress: poolId,
        priceSource: tokenItem ? 'GeckoTerminal' as const : 'Blockscout' as const,
      };
    });

    const withCharts = await Promise.all(enriched.map(async (token, index) => {
      if (index >= 8) return token;
      if (!token.poolAddress) return token;
      try {
        const chart = await request<{ data: { attributes: { ohlcv_list: number[][] } } }>(`/networks/${NETWORK}/pools/${token.poolAddress}/ohlcv/day?aggregate=1&limit=8&currency=usd`, 900);
        return { ...token, sparkline: chart.data.attributes.ohlcv_list.slice().reverse().map(candle => Number(candle[4])) };
      } catch { return token; }
    }));
    return withCharts;
  } catch {
    return fallback;
  }
}
