import { loadEnvConfig } from '@next/env';
import path from 'path';
loadEnvConfig(path.resolve(__dirname, '..'));

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../src/lib/db/schema';
import { runFullScan } from '../src/lib/agent/proactiveScanner';

async function main() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client, { schema });

  // Pick the first active permit
  const [permit] = await db
    .select({ id: schema.permits.id, name: schema.permits.name, jurisdiction: schema.permits.jurisdiction })
    .from(schema.permits)
    .limit(1);

  if (!permit) { console.error('No permits found'); process.exit(1); }

  // Set expiry 3 days from now (triggers the 3-day warning)
  const in3Days = new Date();
  in3Days.setDate(in3Days.getDate() + 3);

  const { eq } = await import('drizzle-orm');
  await db
    .update(schema.permits)
    .set({ expiryDate: in3Days })
    .where(eq(schema.permits.id, permit.id));

  console.log(`Set expiry on: "${permit.name}" (${permit.jurisdiction}) → ${in3Days.toLocaleDateString()}`);
  console.log('Running scan...');

  const result = await runFullScan();
  console.log('Done:', result);

  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
