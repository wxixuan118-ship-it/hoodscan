// Sourcify's public verification registry for Robinhood Chain (chain 4663).
// It is the fallback for verified-contract data while Blockscout's /api/* sits
// behind a Cloudflare challenge. Detail lookups use no-store: they are keyed by
// address, so caching them in the Data Cache would grow without bound.
import { withCircuitBreaker } from './circuit-breaker';

const BASE_URL = process.env.SOURCIFY_URL || 'https://sourcify.dev/server/v2';
const CHAIN_ID = 4663;

async function api<T>(path: string, revalidate?: number): Promise<T> {
  return withCircuitBreaker('sourcify', async () => {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: { accept: 'application/json' },
      ...(revalidate !== undefined ? { next: { revalidate } } : { cache: 'no-store' as const }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Sourcify returned HTTP ${response.status}`);
    return response.json() as Promise<T>;
  });
}

type ListItem = { address: string; verifiedAt: string; match: string; matchId: string };
type Detail = {
  address: string; verifiedAt: string; match: string;
  compilation?: {
    language: string | null; compilerVersion: string | null; name: string | null;
    compilerSettings?: { optimizer?: { enabled?: boolean; runs?: number } };
  };
  deployment?: { transactionHash: string | null; blockNumber: string | null; deployer: string | null };
};

export type VerifiedContract = {
  address: string; name: string | null; language: string | null; compilerVersion: string | null;
  optimizationEnabled: boolean | null; verifiedAt: string | null; deployer: string | null; creationTx: string | null;
  match: string;
};

function toContract(d: Detail): VerifiedContract {
  return {
    address: d.address, name: d.compilation?.name ?? null, language: d.compilation?.language ?? null,
    compilerVersion: d.compilation?.compilerVersion ?? null,
    optimizationEnabled: d.compilation?.compilerSettings?.optimizer?.enabled ?? null,
    verifiedAt: d.verifiedAt ?? null, deployer: d.deployment?.deployer ?? null,
    creationTx: d.deployment?.transactionHash ?? null, match: d.match,
  };
}

/** Single contract: null when Sourcify has no verification for it (404) or is unreachable. */
export async function getVerifiedContract(address: string): Promise<VerifiedContract | null> {
  try {
    return toContract(await api<Detail>(`/contract/${CHAIN_ID}/${address}?fields=compilation,deployment`));
  } catch {
    return null;
  }
}

/** Most recently verified contracts; details fetched with bounded concurrency. */
export async function getRecentVerifiedContracts(limit = 30, revalidate = 600): Promise<VerifiedContract[]> {
  let items: ListItem[];
  try {
    items = (await api<{ results: ListItem[] }>(`/contracts/${CHAIN_ID}?limit=${limit}&sort=desc`, revalidate)).results ?? [];
  } catch {
    return [];
  }
  const out: VerifiedContract[] = [];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(6, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      const detail = await getVerifiedContract(item.address);
      out.push(detail ?? { address: item.address, name: null, language: null, compilerVersion: null, optimizationEnabled: null, verifiedAt: item.verifiedAt, deployer: null, creationTx: null, match: item.match });
    }
  }));
  return out.sort((a, b) => (b.verifiedAt ?? '').localeCompare(a.verifiedAt ?? ''));
}
