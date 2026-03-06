/**
 * Optional Redis caching layer.
 *
 * Falls back gracefully to no-cache when REDIS_URL is not set.
 * All cache functions are safe to call without Redis configured —
 * get() returns null, set() and del() are no-ops.
 *
 * Usage:
 *   import { cache } from '@/lib/cache/redis';
 *   const data = await cache.get<MyType>('key');
 *   await cache.set('key', data, 300); // TTL in seconds
 */

interface CacheClient {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  isConnected(): boolean;
}

// ── In-memory fallback (used when Redis is not configured) ───────────────────

class MemoryCache implements CacheClient {
  private store = new Map<string, { value: string; expiresAt: number }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return JSON.parse(entry.value) as T;
  }

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    this.store.set(key, {
      value: JSON.stringify(value),
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  isConnected(): boolean {
    return true; // memory cache is always "connected"
  }
}

// ── Redis client (lazy-loaded when REDIS_URL is set) ─────────────────────────

class RedisCache implements CacheClient {
  private client: import('ioredis').default | null = null;
  private connecting = false;
  private connected = false;

  private async connect(): Promise<void> {
    if (this.client || this.connecting) return;
    this.connecting = true;

    try {
      const Redis = (await import('ioredis')).default;
      this.client = new Redis(process.env.REDIS_URL!, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        connectTimeout: 5000,
      });

      this.client.on('connect', () => { this.connected = true; });
      this.client.on('error', (...args: unknown[]) => {
        const err = args[0] as Error;
        console.error('[redis] Connection error:', err?.message);
        this.connected = false;
      });
      this.client.on('close', () => { this.connected = false; });

      await this.client.connect();
    } catch (err) {
      console.warn('[redis] Failed to connect, falling back to memory cache:', err instanceof Error ? err.message : err);
      this.client = null;
      this.connected = false;
    } finally {
      this.connecting = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    await this.connect();
    if (!this.client) return null;

    try {
      const raw = await this.client.get(`permitiq:${key}`);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    await this.connect();
    if (!this.client) return;

    try {
      await this.client.setex(`permitiq:${key}`, ttlSeconds, JSON.stringify(value));
    } catch {
      // silent fail — caching is optional
    }
  }

  async del(key: string): Promise<void> {
    await this.connect();
    if (!this.client) return;

    try {
      await this.client.del(`permitiq:${key}`);
    } catch {
      // silent fail
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// ── Singleton export ─────────────────────────────────────────────────────────

function createCache(): CacheClient {
  if (process.env.REDIS_URL) {
    return new RedisCache();
  }
  return new MemoryCache();
}

/** Global cache instance. Uses Redis if REDIS_URL is set, in-memory otherwise. */
export const cache = createCache();

// ── Cache key helpers ────────────────────────────────────────────────────────

export const CacheKeys = {
  permitStats: () => 'permits:stats',
  analyticsKpis: () => 'analytics:kpis',
  jurisdictionAvg: (jurisdiction: string) => `jurisdiction:avg:${jurisdiction}`,
  userPrefs: (userId: string) => `user:prefs:${userId}`,
  rateLimit: (identifier: string, window: string) => `ratelimit:${identifier}:${window}`,
} as const;

/** Default TTLs in seconds */
export const CacheTTL = {
  SHORT: 60,       // 1 minute — rate limits, rapidly changing data
  MEDIUM: 300,     // 5 minutes — dashboard stats, analytics
  LONG: 3600,      // 1 hour — jurisdiction data, user prefs
  DAY: 86400,      // 24 hours — rarely changing reference data
} as const;
