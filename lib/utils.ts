// Utility functions for HoodScan

export function shortenAddress(addr: string, chars = 6): string {
  if (!addr) return '';
  return `${addr.slice(0, chars + 2)}...${addr.slice(-4)}`;
}

export function shortenHash(hash: string, chars = 8): string {
  if (!hash) return '';
  return `${hash.slice(0, chars + 2)}...${hash.slice(-6)}`;
}

export function formatNumber(n: number | string): string {
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(num)) return String(n);
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(2) + 'K';
  return num.toLocaleString();
}

export function timeAgo(timestamp: number): string {
  const diff = Math.floor(Date.now() / 1000) - timestamp;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'UTC', timeZoneName: 'short',
  });
}

export function formatGas(gas: string | number): string {
  const n = Number(gas);
  if (isNaN(n)) return String(gas);
  return n.toLocaleString();
}

export function isAddress(str: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(str);
}

export function isHash(str: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(str);
}

export function isBlockNumber(str: string): boolean {
  return /^\d+$/.test(str);
}

// AI Risk Summary rules engine
export interface RiskFactor {
  level: 'high' | 'medium' | 'low';
  message: string;
}

export function computeRisk(token: {
  holders: number;
  contractVerified: boolean;
  createdAt: number;
  transfers: number;
}): { score: 'High' | 'Medium' | 'Low'; factors: RiskFactor[] } {
  const factors: RiskFactor[] = [];
  const now = Math.floor(Date.now() / 1000);
  const ageInDays = (now - token.createdAt) / 86400;

  if (ageInDays < 7) {
    factors.push({ level: 'high', message: `Token created only ${Math.floor(ageInDays)} days ago` });
  }

  if (!token.contractVerified) {
    factors.push({ level: 'high', message: 'Contract source code is not verified' });
  }

  if (token.holders < 500) {
    factors.push({ level: 'high', message: `Very low holder count (${token.holders.toLocaleString()})` });
  } else if (token.holders < 2000) {
    factors.push({ level: 'medium', message: `Low holder count (${token.holders.toLocaleString()})` });
  }

  if (token.transfers < 1000) {
    factors.push({ level: 'medium', message: 'Low transaction activity' });
  }

  const highCount = factors.filter(f => f.level === 'high').length;
  const score = highCount >= 2 ? 'High' : highCount === 1 ? 'Medium' : 'Low';

  return { score, factors };
}
