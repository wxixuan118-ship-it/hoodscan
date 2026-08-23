// Minimal per-upstream circuit breaker. When an upstream (Blockscout, GeckoTerminal,
// the RPC node) is down, every in-flight request otherwise has to wait out its full
// fetch timeout before failing — under concurrent traffic that piles up a lot of
// simultaneously-hanging requests, each holding memory until it times out. Once a
// few consecutive failures are seen, trip the breaker so subsequent calls fail
// instantly (no network round-trip) for a cooldown window instead of queueing up
// behind the same dead upstream.

type BreakerState = { failures: number; openUntil: number };

const breakers = new Map<string, BreakerState>();

const FAILURE_THRESHOLD = 5;
const COOLDOWN_MS = 30_000;

export class CircuitOpenError extends Error {
  constructor(key: string) {
    super(`Circuit open for "${key}" — upstream failing, skipping call`);
    this.name = 'CircuitOpenError';
  }
}

export function isCircuitOpen(key: string): boolean {
  const state = breakers.get(key);
  return !!state && Date.now() < state.openUntil;
}

export function recordSuccess(key: string): void {
  breakers.delete(key);
}

export function recordFailure(key: string): void {
  const state = breakers.get(key) ?? { failures: 0, openUntil: 0 };
  state.failures++;
  if (state.failures >= FAILURE_THRESHOLD) {
    state.openUntil = Date.now() + COOLDOWN_MS;
    state.failures = 0;
  }
  breakers.set(key, state);
}

/** Runs fn() through the breaker for `key`, recording success/failure automatically. */
export async function withCircuitBreaker<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (isCircuitOpen(key)) throw new CircuitOpenError(key);
  try {
    const result = await fn();
    recordSuccess(key);
    return result;
  } catch (err) {
    recordFailure(key);
    throw err;
  }
}
