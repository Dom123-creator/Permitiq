import { loadEnvConfig } from '@next/env';
import path from 'path';
loadEnvConfig(path.resolve(__dirname, '..'));

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import * as schema from '../src/lib/db/schema';

async function main() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client, { schema });

  const result = await db
    .update(schema.users)
    .set({
      telegramChatId: '7219401696',
      notificationChannel: 'telegram',
      notifyEvents: JSON.stringify([
        'permit.status', 'permit.approved', 'inspection.fail',
        'inspection.result', 'expiry', 'deadline', 'task.created', 'daily.digest',
      ]),
    })
    .where(eq(schema.users.email, 'admin@permitiq.dev'))
    .returning({ id: schema.users.id, name: schema.users.name, telegramChatId: schema.users.telegramChatId });

  console.log('✅ Telegram linked:', result[0]);
  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
