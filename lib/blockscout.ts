import { formatEther, getLatestTransactions } from './robinhood-rpc';
import { withCircuitBreaker } from './circuit-breaker';
import { getChainCounters } from './chain-stats';

const BASE_URL = process.env.BLOCKSCOUT_API_URL || 'https://robinhoodchain.blockscout.com/api/v2';

// `revalidate` opts a call into Next's persistent Data Cache, keyed by URL. Only pass
// it for endpoints with a small, fixed key space (no per-address/tx/token path segment)
// — otherwise every distinct address/token/tx creates a cache entry that's never
// revisited and never cleaned up, silently filling the disk over time.
//
// Routed through the circuit breaker: when Blockscout is down, fetch() can hang for
// the full timeout on every concurrent request before failing. Once a few calls fail
// in a row, the breaker trips and further calls fail instantly instead of piling up
// as simultaneous hung requests.
async function api<T>(path: string, revalidate?: number): Promise<T> {
  return withCircuitBreaker('blockscout', async () => {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: { accept: 'application/json' },
      ...(revalidate !== undefined ? { next: { revalidate } } : { cache: 'no-store' as const }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`Blockscout API returned HTTP ${response.status}`);
    return response.json() as Promise<T>;
  });
}

type AddressRef = { hash: string; name: string | null; is_contract: boolean; is_verified: boolean };
type AddressInfo = {
  is_verified: boolean;
  creator_address_hash: string | null;
  creation_tx_hash: string | null;
  proxy_type: string | null;
  implementations: Array<{ address: string; name: string | null }>;
  is_scam: boolean;
  reputation: string;
};
type SmartContractInfo = {
  abi: unknown[] | string | null;
  source_code: string | null;
  compiler_version: string | null;
  optimization_enabled: boolean | null;
  verified_twin_address_hash: string | null;
};
type ApiTransaction = {
  hash: string; block_number: number; timestamp: string; from: AddressRef; to: AddressRef | null;
  value: string; status: string; gas_used: string | null; gas_price: string; fee: { value: string };
  method: string | null; result: string; nonce: number;
};
type ApiToken = {
  address_hash: string; name: string; symbol: string; decimals: string | null; total_supply: string | null;
  holders_count: string; exchange_rate: string | null; circulating_market_cap: string | null;
  volume_24h: string | null; icon_url: string | null; type: string; reputation: string;
};

export type IndexedTransaction = {
  hash: string; blockNumber: number; timestamp: number; from: string; to: string | null;
  fromName: string | null; toName: string | null; value: string; status: 'success' | 'failed';
  gasUsed: string; gasPrice: string; fee: string; method: string | null;
};

export type IndexedToken = {
  address: string; name: string; symbol: string; decimals: number; totalSupply: string;
  holders: number; price: number | null; marketCap: number | null; volume24h: number | null;
  iconUrl: string | null; type: string; reputation: string;
};

export type TokenHolder = { address: string; name: string | null; balance: string; percentage: number };
export type TokenTransfer = { hash: string; timestamp: number; from: string; to: string; value: string; method: string | null };
export type TokenBalance = { token: IndexedToken; balance: string };
export type ContractInfo = {
  verified: boolean;
  creator: string | null;
  creationTx: string | null;
  proxyType: string | null;
  implementations: Array<{ address: string; name: string | null }>;
  isScam: boolean;
  reputation: string;
};
export type ContractSourceInfo = {
  abi: unknown[] | string | null;
  sourceCode: string | null;
  compilerVersion: string | null;
  optimizationEnabled: boolean | null;
  verifiedTwin: string | null;
};

function mapTransaction(tx: ApiTransaction): IndexedTransaction {
  return {
    hash: tx.hash, blockNumber: tx.block_number, timestamp: Math.floor(new Date(tx.timestamp).getTime() / 1000),
    from: tx.from.hash, to: tx.to?.hash || null, fromName: tx.from.name, toName: tx.to?.name || null,
    value: formatEther(tx.value, 8), status: tx.status === 'ok' ? 'success' : 'failed',
    gasUsed: tx.gas_used || '0', gasPrice: tx.gas_price, fee: formatEther(tx.fee?.value || '0', 8), method: tx.method,
  };
}

function mapToken(token: ApiToken): IndexedToken {
  return {
    address: token.address_hash, name: token.name || 'Unknown Token', symbol: token.symbol || '—', decimals: Number(token.decimals || 0),
    totalSupply: token.total_supply || '0', holders: Number(token.holders_count || 0),
    price: token.exchange_rate ? Number(token.exchange_rate) : null,
    marketCap: token.circulating_market_cap ? Number(token.circulating_market_cap) : null,
    volume24h: token.volume_24h ? Number(token.volume_24h) : null,
    iconUrl: token.icon_url, type: token.type, reputation: token.reputation,
  };
}

export function formatTokenAmount(raw: string, decimals: number, precision = 6): string {
  if (!raw) return '0';
  const value = BigInt(raw);
  const unit = BigInt(10) ** BigInt(decimals);
  const whole = value / unit;
  const fraction = (value % unit).toString().padStart(decimals, '0').slice(0, precision).replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export type IndexStats = {
  totalAddresses: number; totalBlocks: number; totalTransactions: number; transactionsToday: number;
  tps: string; gasPrice: string;
};

// Network counters come from the stats microservice (not challenge-gated); the
// /api/v2/stats endpoint is only a fallback for gas price + whatever else it offers.
export async function getIndexStats(): Promise<IndexStats | null> {
  const counters = await getChainCounters();
  if (counters && counters.totalTransactions !== null) {
    const today = counters.transactions24h ?? 0;
    return {
      totalAddresses: counters.totalAddresses ?? 0, totalBlocks: counters.totalBlocks ?? 0,
      totalTransactions: counters.totalTransactions, transactionsToday: today,
      tps: (today / 86400).toFixed(1), gasPrice: '—',
    };
  }
  try {
    const stats = await api<{ total_addresses: string; total_blocks: string; total_transactions: string; transactions_today: string; gas_prices: { average: number } | null }>('/stats', 12);
    return {
      totalAddresses: Number(stats.total_addresses), totalBlocks: Number(stats.total_blocks),
      totalTransactions: Number(stats.total_transactions), transactionsToday: Number(stats.transactions_today),
      tps: (Number(stats.transactions_today) / 86400).toFixed(1), gasPrice: stats.gas_prices ? `${stats.gas_prices.average} Gwei` : '—',
    };
  } catch {
    return null;
  }
}

// Indexed list when available (has address labels + decoded method names); otherwise
// the same shape straight from the node so the feed never goes blank.
export async function getTransactions(limit = 50): Promise<IndexedTransaction[]> {
  try {
    const data = await api<{ items: ApiTransaction[] }>('/transactions', 12);
    if (data.items?.length) return data.items.map(mapTransaction);
  } catch { /* fall through to RPC */ }
  try {
    const feed = await getLatestTransactions(limit);
    return feed.map(tx => ({
      hash: tx.hash, blockNumber: tx.blockNumber, timestamp: tx.timestamp, from: tx.from, to: tx.to,
      fromName: null, toName: null, value: tx.value, status: tx.status,
      gasUsed: tx.gasUsed, gasPrice: tx.gasPrice, fee: tx.fee, method: tx.method,
    }));
  } catch {
    return [];
  }
}

export async function getAddressTransactions(address: string, strict = false): Promise<IndexedTransaction[]> {
  try {
    const data = await api<{ items: ApiTransaction[] }>(`/addresses/${encodeURIComponent(address)}/transactions`);
    return data.items.map(mapTransaction);
  } catch (error) {
    if (strict) throw error;
    return [];
  }
}

export async function getTokens(): Promise<IndexedToken[]> {
  try {
    const data = await api<{ items: ApiToken[] }>('/tokens?type=ERC-20', 30);
    return data.items.map(mapToken);
  } catch {
    return [];
  }
}

export async function getToken(address: string): Promise<IndexedToken | null> {
  try { return mapToken(await api<ApiToken>(`/tokens/${encodeURIComponent(address)}`)); }
  catch { return null; }
}

export async function getTokenHolders(address: string, token: IndexedToken, strict = false): Promise<TokenHolder[]> {
  try {
    const data = await api<{ items: Array<{ address: AddressRef; value: string }> }>(`/tokens/${encodeURIComponent(address)}/holders`);
    const supply = BigInt(token.totalSupply || '0');
    return data.items.map(item => ({
      address: item.address.hash, name: item.address.name,
      balance: formatTokenAmount(item.value, token.decimals),
      percentage: supply > BigInt(0) ? Number((BigInt(item.value) * BigInt(10000)) / supply) / 100 : 0,
    }));
  } catch (error) {
    if (strict) throw error;
    return [];
  }
}

export async function getTokenTransfers(address: string, token: IndexedToken, strict = false): Promise<TokenTransfer[]> {
  try {
    const data = await api<{ items: Array<{ transaction_hash: string; timestamp: string; from: AddressRef; to: AddressRef; total: { value: string; decimals: string }; method: string | null }> }>(`/tokens/${encodeURIComponent(address)}/transfers`);
    return data.items.map(item => ({
      hash: item.transaction_hash, timestamp: Math.floor(new Date(item.timestamp).getTime() / 1000),
      from: item.from.hash, to: item.to.hash, value: formatTokenAmount(item.total.value, Number(item.total.decimals || token.decimals)), method: item.method,
    }));
  } catch (error) {
    if (strict) throw error;
    return [];
  }
}

export async function getAddressTokenBalances(address: string, strict = false): Promise<TokenBalance[]> {
  try {
    const data = await api<Array<{ token: ApiToken; value: string }>>(`/addresses/${encodeURIComponent(address)}/token-balances`);
    return data.filter(item => item.token.type === 'ERC-20').map(item => {
      const token = mapToken(item.token);
      return { token, balance: formatTokenAmount(item.value, token.decimals) };
    });
  } catch (error) {
    if (strict) throw error;
    return [];
  }
}

export async function getContractInfo(address: string, strict = false) {
  try {
    const data = await api<AddressInfo>(`/addresses/${encodeURIComponent(address)}`);
    return {
      verified: data.is_verified,
      creator: data.creator_address_hash,
      creationTx: data.creation_tx_hash,
      proxyType: data.proxy_type,
      implementations: data.implementations || [],
      isScam: data.is_scam,
      reputation: data.reputation,
    };
  } catch (error) {
    if (strict) throw error;
    return { verified: false, creator: null, creationTx: null, proxyType: null, implementations: [], isScam: false, reputation: 'unknown' };
  }
}

export async function getContractSourceInfo(address: string, strict = false): Promise<ContractSourceInfo | null> {
  try {
    const data = await api<SmartContractInfo>(`/smart-contracts/${encodeURIComponent(address)}`);
    return {
      abi: data.abi,
      sourceCode: data.source_code,
      compilerVersion: data.compiler_version,
      optimizationEnabled: data.optimization_enabled,
      verifiedTwin: data.verified_twin_address_hash,
    };
  } catch (error) {
    if (strict) throw error;
    return null;
  }
}
