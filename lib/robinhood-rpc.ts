import { withCircuitBreaker } from './circuit-breaker';

const DEFAULT_RPC_URL = 'https://rpc.mainnet.chain.robinhood.com';

const RPC_URL = process.env.ROBINHOOD_RPC_URL || DEFAULT_RPC_URL;

type RpcResponse<T> = {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: { code: number; message: string };
};

export class RpcError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RpcError';
  }
}

// `revalidate` opts a call into Next's persistent Data Cache, keyed by URL + body.
// Only pass it for calls with a small, fixed key space (e.g. no per-block/tx/address
// params) — otherwise every distinct block/tx/address creates a cache entry that's
// never revisited and never cleaned up, silently filling the disk over time.
//
// Routed through the circuit breaker: when the RPC node is down, fetch() can hang for
// the full timeout on every concurrent request before failing. Once a few calls fail
// in a row, the breaker trips and further calls fail instantly instead of piling up
// as simultaneous hung requests.
async function rpc<T>(method: string, params: unknown[], revalidate?: number): Promise<T> {
  return withCircuitBreaker('robinhood-rpc', async () => {
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      ...(revalidate !== undefined ? { next: { revalidate } } : { cache: 'no-store' as const }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) throw new RpcError(`RPC returned HTTP ${response.status}`);
    const payload = (await response.json()) as RpcResponse<T>;
    if (payload.error) throw new RpcError(payload.error.message);
    return payload.result as T;
  });
}

async function rpcBatch<T>(calls: Array<{ method: string; params: unknown[] }>): Promise<T[]> {
  return withCircuitBreaker('robinhood-rpc', () => rpcBatchUncached<T>(calls));
}

// Like rpcBatch, but a per-item error (e.g. a reverting eth_call) yields null for
// that item instead of failing the whole batch.
async function rpcBatchLenient<T>(calls: Array<{ method: string; params: unknown[] }>): Promise<Array<T | null>> {
  return withCircuitBreaker('robinhood-rpc', async () => {
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(calls.map((call, index) => ({ jsonrpc: '2.0', id: index + 1, ...call }))),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new RpcError(`RPC returned HTTP ${response.status}`);
    let payload = (await response.json()) as Array<RpcResponse<T>> | RpcResponse<T>;
    if (!Array.isArray(payload)) {
      // The public node answers an over-limit batch with a single {error: 429} object; back off once.
      if (payload.error?.code !== 429) throw new RpcError(payload.error?.message ?? 'Malformed batch response');
      await new Promise(resolve => setTimeout(resolve, 1500));
      const retry = await fetch(RPC_URL, {
        method: 'POST', headers: { 'content-type': 'application/json' }, cache: 'no-store',
        body: JSON.stringify(calls.map((call, index) => ({ jsonrpc: '2.0', id: index + 1, ...call }))),
        signal: AbortSignal.timeout(15_000),
      });
      payload = (await retry.json()) as Array<RpcResponse<T>> | RpcResponse<T>;
      if (!Array.isArray(payload)) throw new RpcError(payload.error?.message ?? 'RPC rate limited');
    }
    const byId = new Map(payload.map(item => [item.id, item]));
    return calls.map((_, index) => {
      const item = byId.get(index + 1);
      return item && !item.error ? (item.result as T) : null;
    });
  });
}

// The public node rejects large batches with 429; keep each request at ~25 calls.
const RPC_BATCH_MAX = 25;

async function rpcBatchLenientChunked<T>(calls: Array<{ method: string; params: unknown[] }>): Promise<Array<T | null>> {
  const out: Array<T | null> = [];
  for (let i = 0; i < calls.length; i += RPC_BATCH_MAX) {
    out.push(...await rpcBatchLenient<T>(calls.slice(i, i + RPC_BATCH_MAX)));
  }
  return out;
}

async function rpcBatchUncached<T>(calls: Array<{ method: string; params: unknown[] }>): Promise<T[]> {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(calls.map((call, index) => ({ jsonrpc: '2.0', id: index + 1, ...call }))),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) throw new RpcError(`RPC returned HTTP ${response.status}`);
  const payload = (await response.json()) as Array<RpcResponse<T>>;
  const sorted = [...payload].sort((a, b) => a.id - b.id);
  const failed = sorted.find(item => item.error);
  if (failed?.error) throw new RpcError(failed.error.message);
  return sorted.map(item => item.result as T);
}

const hexToNumber = (value: string | null | undefined) => value ? Number(BigInt(value)) : 0;
const hexToBigInt = (value: string | null | undefined) => value ? BigInt(value) : BigInt(0);

export function formatEther(value: string | bigint, precision = 6): string {
  const wei = typeof value === 'bigint' ? value : hexToBigInt(value);
  const unit = BigInt(10) ** BigInt(18);
  const whole = wei / unit;
  const fraction = (wei % unit).toString().padStart(18, '0').slice(0, precision).replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function formatGwei(value: string | bigint, precision = 3): string {
  const wei = typeof value === 'bigint' ? value : hexToBigInt(value);
  const unit = BigInt(10) ** BigInt(9);
  const whole = wei / unit;
  const fraction = (wei % unit).toString().padStart(9, '0').slice(0, precision).replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

type RpcTransaction = {
  hash: string;
  blockNumber: string | null;
  from: string;
  to: string | null;
  value: string;
  gas: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  nonce: string;
  input: string;
};

type RpcBlock = {
  number: string;
  hash: string;
  timestamp: string;
  gasUsed: string;
  gasLimit: string;
  miner: string;
  size: string;
  transactions: string[];
};

type RpcReceipt = {
  status: string;
  gasUsed: string;
  effectiveGasPrice?: string;
  contractAddress: string | null;
};

export type ChainBlock = {
  number: number;
  hash: string;
  timestamp: number;
  txCount: number;
  gasUsed: string;
  gasLimit: string;
  miner: string;
  size: number;
};

export type ChainTransaction = {
  hash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string | null;
  value: string;
  status: 'success' | 'failed' | 'pending';
  gasLimit: string;
  gasUsed: string | null;
  gasPrice: string;
  fee: string | null;
  nonce: number;
  input: string;
  contractAddress: string | null;
};

function normalizeBlock(block: RpcBlock): ChainBlock {
  return {
    number: hexToNumber(block.number),
    hash: block.hash,
    timestamp: hexToNumber(block.timestamp),
    txCount: block.transactions.length,
    gasUsed: hexToBigInt(block.gasUsed).toString(),
    gasLimit: hexToBigInt(block.gasLimit).toString(),
    miner: block.miner,
    size: hexToNumber(block.size),
  };
}

export async function getLatestBlocks(count = 50): Promise<ChainBlock[]> {
  const latest = hexToNumber(await rpc<string>('eth_blockNumber', [], 6));
  const numbers = Array.from({ length: Math.min(count, latest + 1) }, (_, index) => latest - index);
  const blocks = await rpcBatch<RpcBlock>(
    numbers.map(number => ({ method: 'eth_getBlockByNumber', params: [`0x${number.toString(16)}`, false] }))
  );
  return blocks.filter(Boolean).map(normalizeBlock);
}

export async function getNetworkSnapshot() {
  const [blockNumber, gasPrice] = await Promise.all([
    rpc<string>('eth_blockNumber', [], 6),
    rpc<string>('eth_gasPrice', [], 6),
  ]);
  return { blockHeight: hexToNumber(blockNumber), gasPrice: `${formatGwei(gasPrice)} Gwei` };
}

export async function getBlockByNumber(blockNumber: number): Promise<ChainBlock | null> {
  const hex = `0x${blockNumber.toString(16)}`;
  const block = await rpc<RpcBlock | null>('eth_getBlockByNumber', [hex, false]);
  return block ? normalizeBlock(block) : null;
}

export async function getTransactionCount(address: string): Promise<number | null> {
  try {
    return hexToNumber(await rpc<string>('eth_getTransactionCount', [address, 'latest']));
  } catch {
    return null;
  }
}

export async function isContract(address: string): Promise<boolean | null> {
  try {
    const code = await rpc<string>('eth_getCode', [address, 'latest']);
    return !!code && code !== '0x';
  } catch {
    return null;
  }
}

// ERC-20 balanceOf(address) for many tokens in one batched round-trip per 50 tokens.
// Lets the address snapshot show holdings for the tokens we track even when the indexer is down.
export async function getErc20Balances(
  holder: string,
  tokens: Array<{ address: string }>,
): Promise<Map<string, bigint>> {
  const balances = new Map<string, bigint>();
  const data = `0x70a08231${holder.toLowerCase().replace(/^0x/, '').padStart(64, '0')}`;
  for (let i = 0; i < tokens.length; i += RPC_BATCH_MAX) {
    const group = tokens.slice(i, i + RPC_BATCH_MAX);
    try {
      const results = await rpcBatchLenient<string>(group.map(t => ({ method: 'eth_call', params: [{ to: t.address, data }, 'latest'] })));
      results.forEach((raw, index) => {
        if (!raw || raw === '0x' || raw.length < 66) return;
        const value = hexToBigInt(raw.slice(0, 66));
        if (value > BigInt(0)) balances.set(group[index].address.toLowerCase(), value);
      });
    } catch {
      // Node unreachable — skip this group rather than the whole address.
    }
  }
  return balances;
}

/**
 * Accounts ranked by how many of the most recent transactions they sent — a live
 * activity leaderboard computable from the node alone (no indexer), with current
 * ETH balances attached.
 */
export type ActiveAccount = { address: string; sent: number; received: number; balance: string; isContract: boolean };

const ARBOS_ADDRESS = '0x00000000000000000000000000000000000a4b05'; // Arbitrum system address; not a user account

export async function getMostActiveAccounts(sample = 120, top = 25): Promise<ActiveAccount[]> {
  const txs = (await getLatestTransactions(sample, 40, false)).filter(tx => tx.from.toLowerCase() !== ARBOS_ADDRESS);
  const sent = new Map<string, number>(), received = new Map<string, number>();
  for (const tx of txs) {
    const from = tx.from.toLowerCase();
    sent.set(from, (sent.get(from) ?? 0) + 1);
    if (tx.to) { const to = tx.to.toLowerCase(); received.set(to, (received.get(to) ?? 0) + 1); }
  }
  const ranked = [...new Set([...sent.keys(), ...received.keys()])]
    .map(address => ({ address, sent: sent.get(address) ?? 0, received: received.get(address) ?? 0 }))
    .sort((a, b) => (b.sent + b.received) - (a.sent + a.received) || b.sent - a.sent)
    .slice(0, top);
  // One sequential chunked batch (not two parallel ones) — the node rate-limits by call volume.
  const extra = await rpcBatchLenientChunked<string>([
    ...ranked.map(a => ({ method: 'eth_getBalance', params: [a.address, 'latest'] })),
    ...ranked.map(a => ({ method: 'eth_getCode', params: [a.address, 'latest'] })),
  ]);
  return ranked.map((a, i) => ({
    ...a,
    balance: formatEther(extra[i] ?? '0x0', 4),
    isContract: !!extra[ranked.length + i] && extra[ranked.length + i] !== '0x',
  }));
}

export async function getNativeBalance(address: string): Promise<string> {
  try {
    return formatEther(await rpc<string>('eth_getBalance', [address, 'latest']));
  } catch {
    return '0';
  }
}

export async function callContract(to: string, data: string): Promise<string | null> {
  try {
    return await rpc<string>('eth_call', [{ to, data }, 'latest']);
  } catch {
    return null;
  }
}

export type FeedTransaction = {
  hash: string; blockNumber: number; timestamp: number; from: string; to: string | null;
  value: string; status: 'success' | 'failed'; gasUsed: string; gasPrice: string; fee: string; method: string | null;
  contractAddress: string | null;
};

type RpcFullBlock = Omit<RpcBlock, 'transactions'> & { transactions: RpcTransaction[] };

/**
 * Latest transactions straight from the node: walk back from the head block until
 * `limit` transactions are collected, then fetch receipts in one batch for status/fee.
 * No indexer involved, so this keeps /txs and the homepage feed alive when Blockscout is out.
 */
export async function getLatestTransactions(limit = 50, maxBlocks = 12, withReceipts = true): Promise<FeedTransaction[]> {
  const latest = hexToNumber(await rpc<string>('eth_blockNumber', [], 6));
  const numbers = Array.from({ length: Math.min(maxBlocks, latest + 1) }, (_, i) => latest - i);
  const collected: Array<{ tx: RpcTransaction; block: RpcFullBlock }> = [];
  // Four full blocks per round-trip; stop as soon as enough transactions are in hand.
  for (let i = 0; i < numbers.length && collected.length < limit; i += 4) {
    const blocks = await rpcBatch<RpcFullBlock | null>(
      numbers.slice(i, i + 4).map(number => ({ method: 'eth_getBlockByNumber', params: [`0x${number.toString(16)}`, true] })),
    );
    for (const block of blocks) {
      if (!block) continue;
      for (const tx of [...block.transactions].reverse()) { // newest first within a block
        if (collected.length >= limit) break;
        collected.push({ tx, block });
      }
    }
  }
  if (!collected.length) return [];
  const receipts = withReceipts
    ? await rpcBatchLenientChunked<RpcReceipt>(collected.map(({ tx }) => ({ method: 'eth_getTransactionReceipt', params: [tx.hash] })))
    : collected.map(() => null);
  return collected.map(({ tx, block }, index) => {
    const receipt = receipts[index];
    const gasPrice = receipt?.effectiveGasPrice || tx.gasPrice || tx.maxFeePerGas || '0x0';
    const gasUsed = receipt ? hexToBigInt(receipt.gasUsed) : BigInt(0);
    return {
      hash: tx.hash,
      blockNumber: hexToNumber(block.number),
      timestamp: hexToNumber(block.timestamp),
      from: tx.from,
      to: tx.to,
      value: formatEther(tx.value, 8),
      status: receipt && receipt.status !== '0x1' ? 'failed' : 'success',
      gasUsed: gasUsed.toString(),
      gasPrice: formatGwei(gasPrice),
      fee: formatEther(gasUsed * hexToBigInt(gasPrice), 8),
      method: !tx.to ? 'Contract creation' : tx.input === '0x' ? 'Transfer' : tx.input.slice(0, 10),
      contractAddress: receipt?.contractAddress || null,
    };
  });
}

export async function getTransaction(hash: string): Promise<ChainTransaction | null> {
  try {
    return await fetchTransaction(hash);
  } catch {
    return null;
  }
}

async function fetchTransaction(hash: string): Promise<ChainTransaction | null> {
  const tx = await rpc<RpcTransaction | null>('eth_getTransactionByHash', [hash]);
  if (!tx) return null;

  const [receipt, block] = await Promise.all([
    rpc<RpcReceipt | null>('eth_getTransactionReceipt', [hash]),
    tx.blockNumber ? rpc<RpcBlock | null>('eth_getBlockByNumber', [tx.blockNumber, false]) : Promise.resolve(null),
  ]);

  const gasPrice = receipt?.effectiveGasPrice || tx.gasPrice || tx.maxFeePerGas || '0x0';
  const fee = receipt ? hexToBigInt(receipt.gasUsed) * hexToBigInt(gasPrice) : null;

  return {
    hash: tx.hash,
    blockNumber: hexToNumber(tx.blockNumber),
    timestamp: block ? hexToNumber(block.timestamp) : 0,
    from: tx.from,
    to: tx.to,
    value: formatEther(tx.value, 8),
    status: !receipt ? 'pending' : receipt.status === '0x1' ? 'success' : 'failed',
    gasLimit: hexToBigInt(tx.gas).toString(),
    gasUsed: receipt ? hexToBigInt(receipt.gasUsed).toString() : null,
    gasPrice: formatGwei(gasPrice),
    fee: fee === null ? null : formatEther(fee, 8),
    nonce: hexToNumber(tx.nonce),
    input: tx.input,
    contractAddress: receipt?.contractAddress || null,
  };
}
