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

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    next: { revalidate: 6 },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) throw new RpcError(`RPC returned HTTP ${response.status}`);
  const payload = (await response.json()) as RpcResponse<T>;
  if (payload.error) throw new RpcError(payload.error.message);
  return payload.result as T;
}

async function rpcBatch<T>(calls: Array<{ method: string; params: unknown[] }>): Promise<T[]> {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(calls.map((call, index) => ({ jsonrpc: '2.0', id: index + 1, ...call }))),
    next: { revalidate: 6 },
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
  const latest = hexToNumber(await rpc<string>('eth_blockNumber', []));
  const numbers = Array.from({ length: Math.min(count, latest + 1) }, (_, index) => latest - index);
  const blocks = await rpcBatch<RpcBlock>(
    numbers.map(number => ({ method: 'eth_getBlockByNumber', params: [`0x${number.toString(16)}`, false] }))
  );
  return blocks.filter(Boolean).map(normalizeBlock);
}

export async function getNetworkSnapshot() {
  const [blockNumber, gasPrice] = await Promise.all([
    rpc<string>('eth_blockNumber', []),
    rpc<string>('eth_gasPrice', []),
  ]);
  return { blockHeight: hexToNumber(blockNumber), gasPrice: `${formatGwei(gasPrice)} Gwei` };
}

export async function getBlockByNumber(blockNumber: number): Promise<ChainBlock | null> {
  const hex = `0x${blockNumber.toString(16)}`;
  const block = await rpc<RpcBlock | null>('eth_getBlockByNumber', [hex, false]);
  return block ? normalizeBlock(block) : null;
}

export async function getNativeBalance(address: string): Promise<string> {
  return formatEther(await rpc<string>('eth_getBalance', [address, 'latest']));
}

export async function callContract(to: string, data: string): Promise<string | null> {
  try {
    return await rpc<string>('eth_call', [{ to, data }, 'latest']);
  } catch {
    return null;
  }
}

export async function getTransaction(hash: string): Promise<ChainTransaction | null> {
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
