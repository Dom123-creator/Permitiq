/**
 * Type stubs for optional dependencies that are dynamically imported.
 * These modules may not be installed in all environments.
 */

declare module 'playwright' {
  export const chromium: {
    launch(options?: { headless?: boolean }): Promise<{
      newPage(): Promise<{
        setDefaultTimeout(ms: number): void;
        goto(url: string, options?: { waitUntil?: string }): Promise<void>;
        $(selector: string): Promise<{
          textContent(): Promise<string | null>;
        } | null>;
        close(): Promise<void>;
      }>;
      close(): Promise<void>;
    }>;
  };
}

declare module 'ioredis' {
  interface RedisOptions {
    maxRetriesPerRequest?: number;
    lazyConnect?: boolean;
    connectTimeout?: number;
  }

  class Redis {
    constructor(url: string, options?: RedisOptions);
    connect(): Promise<void>;
    get(key: string): Promise<string | null>;
    setex(key: string, ttl: number, value: string): Promise<string>;
    del(key: string): Promise<number>;
    on(event: string, callback: (...args: unknown[]) => void): this;
  }

  export default Redis;
}
