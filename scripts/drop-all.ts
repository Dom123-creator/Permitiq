import { loadEnvConfig } from '@next/env';
import path from 'path';
loadEnvConfig(path.resolve(__dirname, '..'));

import postgres from 'postgres';

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) throw new Error('DATABASE_URL not set');

const sql = postgres(DB_URL);

async function dropAll() {
  const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
  console.log('Existing tables:', tables.map(t => t.tablename).join(', '));

  if (tables.length > 0) {
    await sql.unsafe('DROP SCHEMA public CASCADE');
    await sql.unsafe('CREATE SCHEMA public');
    console.log('Dropped all tables, recreated public schema.');
  } else {
    console.log('No tables to drop.');
  }

  await sql.end();
}

dropAll().catch((err) => {
  console.error('Failed:', err.message);
  sql.end();
  process.exit(1);
});
