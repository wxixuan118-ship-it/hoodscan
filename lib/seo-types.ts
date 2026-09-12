import type { PricedToken } from './price-service';
import type { ContractInfo, TokenHolder, TokenTransfer, TokenBalance, IndexedTransaction } from './blockscout';
import type { TokenRiskReport } from './token-risk';
import type { DbToken } from './db-client';

// `degraded` marks a snapshot published while the indexer (Blockscout) was unreachable:
// holders / transfers / address history are empty and the page is served noindex.
export type TokenSnapshot = {
  token: PricedToken; holders: TokenHolder[]; transfers: TokenTransfer[];
  contract: ContractInfo; risk: TokenRiskReport | null; degraded?: boolean;
};
export type AddressSnapshot = {
  ethBalance: string; displayTxs: IndexedTransaction[]; tokenBalances: TokenBalance[];
  degraded?: boolean; txCount?: number | null; isContract?: boolean | null;
};
export type Snapshot<T> = {
  payload: T; indexable: boolean; content_updated_at: string; fetched_at: string;
};
export const isAddress = (value: string) => /^0x[0-9a-fA-F]{40}$/.test(value);
// pg returns NUMERIC columns as strings; normalize only display values, never raw balances.
const numeric = (value: unknown): number | null => value == null || !Number.isFinite(Number(value)) ? null : Number(value);
export function pricedToken(row: DbToken): PricedToken {
  return {
    address: row.address, name: row.name, symbol: row.symbol, decimals: row.decimals,
    totalSupply: row.total_supply ?? '0', holders: row.holders_count,
    price: numeric(row.price_usd), change24h: numeric(row.price_change_24h),
    marketCap: numeric(row.market_cap), volume24h: numeric(row.volume_24h), liquidity: numeric(row.liquidity),
    iconUrl: row.icon_url, type: row.type, reputation: row.reputation ?? 'unknown',
    dex: row.dex_name, poolAddress: row.top_pool_address, sparkline: [],
    priceSource: row.price_source === 'GeckoTerminal' ? 'GeckoTerminal' : 'Blockscout',
  };
}
