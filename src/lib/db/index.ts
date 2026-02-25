import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleDb | null = null;

/**
 * Returns the Drizzle DB instance, lazily initialized.
 * Throws at call time (not module load time) if DATABASE_URL is not set.
 * Use this in API route handlers so a missing DATABASE_URL returns a 503
 * instead of crashing the Next.js server at startup.
 */
export function getDb(): DrizzleDb {
  if (_db) return _db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const client = postgres(connectionString);
  _db = drizzle(client, { schema });
  return _db;
}

export * from './schema';
