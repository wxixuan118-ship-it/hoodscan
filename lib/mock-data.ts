// Mock data for HoodScan - Robinhood Chain Explorer
// Replace with real RPC/Blockscout API calls in production

export interface Block {
  number: number;
  hash: string;
  timestamp: number;
  txCount: number;
  gasUsed: string;
  gasLimit: string;
  miner: string;
  size: number;
}

export interface Transaction {
  hash: string;
  blockNumber: number;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  status: 'success' | 'failed';
  gasUsed: string;
  gasPrice: string;
  nonce: number;
  input: string;
}

export interface Token {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  holders: number;
  transfers: number;
  createdAt: number;
  contractVerified: boolean;
  price?: string;
  marketCap?: string;
}

export interface Holder {
  rank: number;
  wallet: string;
  balance: string;
  percentage: number;
}

export interface NetworkStats {
  blockHeight: number;
  totalTransactions: number;
  totalAddresses: number;
  gasPrice: string;
  tps: string;
}

// ── Helpers ──────────────────────────────────────────────
const now = Math.floor(Date.now() / 1000);
const addr = (n: number) => `0x${n.toString(16).padStart(40, '0')}`;
const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;

// ── Blocks ───────────────────────────────────────────────
export const MOCK_BLOCKS: Block[] = Array.from({ length: 50 }, (_, i) => ({
  number: 2_450_000 - i,
  hash: hash(2_450_000 - i),
  timestamp: now - i * 12,
  txCount: Math.floor(Math.random() * 80) + 5,
  gasUsed: (Math.random() * 15_000_000 + 3_000_000).toFixed(0),
  gasLimit: '30000000',
  miner: addr(i + 1),
  size: Math.floor(Math.random() * 50000) + 10000,
}));

// ── Transactions ─────────────────────────────────────────
export const MOCK_TXS: Transaction[] = Array.from({ length: 50 }, (_, i) => ({
  hash: hash(i + 100),
  blockNumber: 2_450_000 - Math.floor(i / 5),
  from: addr(i * 2 + 10),
  to: addr(i * 2 + 11),
  value: (Math.random() * 5).toFixed(4),
  timestamp: now - i * 15,
  status: Math.random() > 0.05 ? 'success' : 'failed',
  gasUsed: (Math.floor(Math.random() * 100_000) + 21_000).toString(),
  gasPrice: (Math.random() * 50 + 1).toFixed(2),
  nonce: i,
  input: i % 3 === 0 ? '0x' : '0xa9059cbb000000000000000000000000' + addr(i + 5).slice(2) + '0000000000000000000000000000000000000000000000000de0b6b3a7640000',
}));

// ── Tokens ───────────────────────────────────────────────
export const MOCK_TOKENS: Token[] = [
  { address: addr(0xdead01), name: 'Hood Finance',      symbol: 'HOOD',  decimals: 18, totalSupply: '1000000000', holders: 42_830, transfers: 1_230_000, createdAt: now - 86400 * 180, contractVerified: true,  price: '$0.0823', marketCap: '$8.23M' },
  { address: addr(0xdead02), name: 'Robin Token',       symbol: 'ROBIN', decimals: 18, totalSupply: '500000000',  holders: 18_240, transfers: 640_000,   createdAt: now - 86400 * 90,  contractVerified: true,  price: '$0.142',  marketCap: '$71M'  },
  { address: addr(0xdead03), name: 'Chain USD',         symbol: 'cUSD',  decimals: 6,  totalSupply: '50000000',   holders: 95_110, transfers: 5_400_000, createdAt: now - 86400 * 120, contractVerified: true,  price: '$1.00',   marketCap: '$50M'  },
  { address: addr(0xdead04), name: 'Wrapped ETH',       symbol: 'WETH',  decimals: 18, totalSupply: '30000',      holders: 28_500, transfers: 2_100_000, createdAt: now - 86400 * 150, contractVerified: true,  price: '$2,400',  marketCap: '$72M'  },
  { address: addr(0xdead05), name: 'Hood DEX Token',    symbol: 'HDX',   decimals: 18, totalSupply: '200000000',  holders: 6_300,  transfers: 380_000,   createdAt: now - 86400 * 30,  contractVerified: false, price: '$0.0091', marketCap: '$1.82M'},
  { address: addr(0xdead06), name: 'Meme Hood Coin',    symbol: 'MHOOD', decimals: 18, totalSupply: '999999999999', holders: 3_200, transfers: 120_000,  createdAt: now - 86400 * 3,   contractVerified: false },
  { address: addr(0xdead07), name: 'RH Governance',    symbol: 'RHG',   decimals: 18, totalSupply: '100000000',   holders: 11_400, transfers: 890_000,  createdAt: now - 86400 * 60,  contractVerified: true  },
  { address: addr(0xdead08), name: 'Liquid Staked RH', symbol: 'lsRH',  decimals: 18, totalSupply: '8000000',     holders: 4_600,  transfers: 210_000,  createdAt: now - 86400 * 45,  contractVerified: true  },
];

// ── Holders ──────────────────────────────────────────────
export const MOCK_HOLDERS: Holder[] = [
  { rank: 1, wallet: addr(0xabc001), balance: '125,000,000', percentage: 12.5 },
  { rank: 2, wallet: addr(0xabc002), balance: '98,500,000',  percentage: 9.85 },
  { rank: 3, wallet: addr(0xabc003), balance: '72,300,000',  percentage: 7.23 },
  { rank: 4, wallet: addr(0xabc004), balance: '65,000,000',  percentage: 6.5  },
  { rank: 5, wallet: addr(0xabc005), balance: '48,200,000',  percentage: 4.82 },
  { rank: 6, wallet: addr(0xabc006), balance: '43,700,000',  percentage: 4.37 },
  { rank: 7, wallet: addr(0xabc007), balance: '38,100,000',  percentage: 3.81 },
  { rank: 8, wallet: addr(0xabc008), balance: '30,500,000',  percentage: 3.05 },
  { rank: 9, wallet: addr(0xabc009), balance: '27,400,000',  percentage: 2.74 },
  { rank: 10, wallet: addr(0xabc010), balance: '22,900,000', percentage: 2.29 },
];

// ── Network Stats ────────────────────────────────────────
export const NETWORK_STATS: NetworkStats = {
  blockHeight: 2_450_000,
  totalTransactions: 48_320_891,
  totalAddresses: 1_240_388,
  gasPrice: '0.001 Gwei',
  tps: '14.3',
};
