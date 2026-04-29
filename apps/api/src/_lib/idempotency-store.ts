/**
 * Webhook idempotency store contract.
 *
 * Implementations:
 *   - {@link InMemoryIdempotencyStore} — single-process Map with FIFO eviction.
 *     The default in dev / single-instance deploys.
 *   - {@link RedisIdempotencyStore} — `SET key 1 NX PX <ttlMs>` against Redis.
 *     The shared store for multi-instance deploys; one webhook delivery is
 *     processed exactly once across the fleet.
 *
 * `claim()` is the only mutating call. A `true` result means the caller owns
 * the work for this event; `false` means another worker (or earlier retry)
 * already claimed it and the controller should short-circuit with 200 OK.
 */
export interface IdempotencyStore {
  readonly name: 'in-memory' | 'redis';
  claim(key: string, ttlMs?: number): Promise<boolean>;
  has(key: string): Promise<boolean>;
}
