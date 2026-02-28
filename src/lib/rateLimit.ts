/**
 * In-memory sliding window rate limiter.
 *
 * Suitable for single-server / development. For multi-instance production
 * deployments, swap the Map for a Redis ZADD/ZREMRANGEBYSCORE approach.
 */

interface RateLimitConfig {
  windowMs: number; // window size in milliseconds
  max: number;      // max requests allowed per window
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // Unix timestamp in seconds when the window resets
}

// Module-level store: key → array of request timestamps (ms)
const store = new Map<string, number[]>();

// Clean up entries that are entirely outside any window (run periodically)
function cleanup(windowMs: number) {
  const cutoff = Date.now() - windowMs;
  store.forEach((timestamps, key) => {
    if (timestamps.length === 0 || timestamps[timestamps.length - 1] < cutoff) {
      store.delete(key);
    }
  });
}

let cleanupCounter = 0;

export function rateLimit(key: string, config: RateLimitConfig = { windowMs: 60_000, max: 100 }): RateLimitResult {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Prune timestamps outside the current window
  const timestamps = (store.get(key) ?? []).filter((t) => t > windowStart);

  const resetAt = Math.ceil((windowStart + config.windowMs) / 1000);

  if (timestamps.length >= config.max) {
    store.set(key, timestamps);
    return { success: false, limit: config.max, remaining: 0, resetAt };
  }

  timestamps.push(now);
  store.set(key, timestamps);

  // Periodic cleanup every 500 calls to cap memory usage
  if (++cleanupCounter % 500 === 0) {
    cleanup(config.windowMs);
  }

  return {
    success: true,
    limit: config.max,
    remaining: config.max - timestamps.length,
    resetAt,
  };
}
