/**
 * Seed fee entries — safe to run against an already-seeded DB.
 * Run with: npx tsx scripts/seed-fees.ts
 */
import { loadEnvConfig } from '@next/env';
import path from 'path';
loadEnvConfig(path.resolve(__dirname, '..'));

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import * as schema from '../src/lib/db/schema';

const { permits, fees } = schema;

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) throw new Error('DATABASE_URL not set');

const client = postgres(DB_URL);
const db = drizzle(client, { schema });

async function seedFees() {
  console.log('🌱 Seeding fee entries...');

  // Look up permits by permit number
  const [p1] = await db.select({ id: permits.id }).from(permits).where(eq(permits.permitNumber, 'BP-2024-001234')).limit(1);
  const [p2] = await db.select({ id: permits.id }).from(permits).where(eq(permits.permitNumber, 'EP-2024-005678')).limit(1);
  const [p3] = await db.select({ id: permits.id }).from(permits).where(eq(permits.permitNumber, 'PP-2024-003456')).limit(1);
  const [p5] = await db.select({ id: permits.id }).from(permits).where(eq(permits.permitNumber, 'FP-2024-002345')).limit(1);
  const [p6] = await db.select({ id: permits.id }).from(permits).where(eq(permits.permitNumber, 'BP-2024-001567')).limit(1);

  if (!p1 || !p2 || !p3 || !p5 || !p6) {
    throw new Error('Could not find all required permits — has seed.ts been run?');
  }

  const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

  await db.insert(fees).values([
    // BP-2024-001234 — Building Permit Foundation (Houston)
    {
      permitId: p1.id,
      type: 'base',
      amount: '3200.00',
      paidAt: daysAgo(10),
    },
    {
      permitId: p1.id,
      type: 'plan-check',
      amount: '480.00',
      paidAt: daysAgo(10),
    },

    // EP-2024-005678 — Electrical (Harris County) — info-requested, one fee unpaid
    {
      permitId: p2.id,
      type: 'base',
      amount: '1850.00',
      paidAt: null, // unpaid — awaiting info response
    },

    // PP-2024-003456 — Plumbing (Houston) — approved, fee paid
    {
      permitId: p3.id,
      type: 'base',
      amount: '950.00',
      paidAt: daysAgo(5),
    },
    {
      permitId: p3.id,
      type: 're-inspection',
      amount: '150.00',
      paidAt: daysAgo(5),
    },

    // FP-2024-002345 — Fire Alarm (Houston)
    {
      permitId: p5.id,
      type: 'base',
      amount: '750.00',
      paidAt: null,
    },

    // BP-2024-001567 — Structural (Houston) — multiple fees
    {
      permitId: p6.id,
      type: 'base',
      amount: '4400.00',
      paidAt: daysAgo(20),
    },
    {
      permitId: p6.id,
      type: 'plan-check',
      amount: '660.00',
      paidAt: daysAgo(20),
    },
    {
      permitId: p6.id,
      type: 'expedite',
      amount: '500.00',
      paidAt: null, // expedite fee pending
    },
  ]);

  console.log('✓ 9 fee entries inserted');
  console.log('\n✅ Done.');
  await client.end();
}

seedFees().catch((err) => {
  console.error('Failed:', err.message);
  client.end();
  process.exit(1);
});
