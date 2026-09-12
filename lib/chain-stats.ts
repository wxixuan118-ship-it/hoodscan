// Blockscout's stats microservice. Unlike /api/v2/*, this service is not behind the
// Cloudflare challenge, so it is the primary source for network-wide counters and
// daily activity series. Every endpoint here has a tiny, fixed key space, so opting
// into Next's Data Cache via `revalidate` is safe (no per-address entries).
import { withCircuitBreaker } from './circuit-breaker';
import type { DbDailyStat } from './db-client';

const BASE_URL = process.env.BLOCKSCOUT_STATS_URL || 'https://robinhoodchain.blockscout.com/stats-service/api/v1';

async function api<T>(path: string, revalidate: number): Promise<T> {
  return withCircuitBreaker('blockscout-stats', async () => {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: { accept: 'application/json' },
      next: { revalidate },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Blockscout stats returned HTTP ${response.status}`);
    return response.json() as Promise<T>;
  });
}

const num = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export type ChainCounters = {
  totalTransactions: number | null;
  completedTransactions: number | null;
  totalAddresses: number | null;
  totalAccounts: number | null;
  totalBlocks: number | null;
  totalContracts: number | null;
  totalVerifiedContracts: number | null;
  totalTokens: number | null;
  transactions24h: number | null;
  averageBlockTime: number | null;   // seconds
  averageTxnFee24h: number | null;   // ETH
  txnsFee24h: number | null;         // ETH
};

export async function getChainCounters(revalidate = 60): Promise<ChainCounters | null> {
  try {
    const data = await api<{ counters: Array<{ id: string; value: string }> }>('/counters', revalidate);
    const c = new Map(data.counters.map(item => [item.id, item.value]));
    return {
      totalTransactions:      num(c.get('totalTxns')),
      completedTransactions:  num(c.get('completedTxns')),
      totalAddresses:         num(c.get('totalAddresses')),
      totalAccounts:          num(c.get('totalAccounts')),
      totalBlocks:            num(c.get('totalBlocks')),
      totalContracts:         num(c.get('totalContracts')),
      totalVerifiedContracts: num(c.get('totalVerifiedContracts')),
      totalTokens:            num(c.get('totalTokens')),
      transactions24h:        num(c.get('newTxns24h')),
      averageBlockTime:       num(c.get('averageBlockTime')),
      averageTxnFee24h:       num(c.get('averageTxnFee24h')),
      txnsFee24h:             num(c.get('txnsFee24h')),
    };
  } catch {
    return null;
  }
}

type LinePoint = { date: string; value: string; is_approximate?: boolean };

async function line(id: string, revalidate: number): Promise<Map<string, number | null>> {
  const data = await api<{ chart: LinePoint[] }>(`/lines/${id}?resolution=DAY`, revalidate);
  return new Map(data.chart.map(point => [point.date, num(point.value)]));
}

/**
 * Daily activity rows in the shape of the `daily_stats` table, newest first.
 * Each series is fetched independently so one missing chart does not blank the table.
 */
export async function getDailyActivity(days = 30, revalidate = 900): Promise<DbDailyStat[]> {
  const ids = ['newTxns', 'activeAccounts', 'newContracts', 'averageGasPrice', 'newNativeCoinTransfers'] as const;
  const results = await Promise.allSettled(ids.map(id => line(id, revalidate)));
  const series = ids.map((_, i) => {
    const r = results[i];
    return r.status === 'fulfilled' ? r.value : new Map<string, number | null>();
  });
  const [txns, active, contracts, gas, transfers] = series;
  if (!txns.size) return [];
  return Array.from(txns.keys())
    .sort((a, b) => (a < b ? 1 : -1))
    .slice(0, days)
    .map(date => ({
      date,
      total_transactions: txns.get(date) ?? null,
      active_addresses:   active.get(date) ?? null,
      new_contracts:      contracts.get(date) ?? null,
      avg_gas_gwei:       gas.get(date) ?? null,
      token_transfers:    transfers.get(date) ?? null,
    }));
}
