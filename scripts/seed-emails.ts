/**
 * Seed email drafts only — safe to run against an already-seeded DB.
 * Run with: npx tsx scripts/seed-emails.ts
 */
import { loadEnvConfig } from '@next/env';
import path from 'path';
loadEnvConfig(path.resolve(__dirname, '..'));

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import * as schema from '../src/lib/db/schema';

const { permits, emailDrafts } = schema;

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) throw new Error('DATABASE_URL not set');

const client = postgres(DB_URL);
const db = drizzle(client, { schema });

async function seedEmails() {
  console.log('🌱 Seeding email drafts...');

  // Look up permit IDs by permit number
  const [p4] = await db.select({ id: permits.id }).from(permits)
    .where(eq(permits.permitNumber, 'MP-2024-007890')).limit(1);
  const [p2] = await db.select({ id: permits.id }).from(permits)
    .where(eq(permits.permitNumber, 'EP-2024-005678')).limit(1);
  const [p6] = await db.select({ id: permits.id }).from(permits)
    .where(eq(permits.permitNumber, 'BP-2024-001567')).limit(1);

  if (!p4 || !p2 || !p6) {
    throw new Error('Could not find all required permits — has seed.ts been run?');
  }

  await db.insert(emailDrafts).values([
    {
      permitId: p4.id,
      subject: 'Urgent: Permit Review Escalation - MP-2024-007890',
      body: `Dear City of Austin Development Services,

I am writing to request an expedited review of permit application MP-2024-007890 for the University Science Building project.

This permit has been under review for 35 days, which exceeds the typical processing time of 18 days for Mechanical permits in Austin.

The delay is impacting our construction schedule and causing significant carrying costs. We kindly request this application be prioritized for review.

Please let us know if any additional documentation is required to expedite this process.

Thank you for your attention to this matter.

Best regards,
[Your Name]
[Company Name]
[Phone]`,
      recipient: 'permits@austintexas.gov',
      recipientName: 'Austin Development Services',
      templateType: 'escalation',
      createdBy: 'agent',
      status: 'pending-review',
    },
    {
      permitId: p2.id,
      subject: 'Re: Additional Information Request - EP-2024-005678',
      body: `Dear Harris County Permit Office,

Thank you for your review of permit application EP-2024-005678 for the Memorial Hospital Wing project.

In response to your request for additional information, we are preparing the updated electrical load calculations you requested and anticipate submitting the revised documents within 5 business days.

We understand the urgency given the current status and will prioritize this immediately. Please let us know if you need any clarification in the meantime.

Best regards,
[Your Name]
[Company Name]`,
      recipient: 'permits@harriscountytx.gov',
      recipientName: 'Harris County Permit Office',
      templateType: 'info-response',
      createdBy: 'agent',
      status: 'pending-review',
    },
    {
      permitId: p6.id,
      subject: 'Status Inquiry - Permit BP-2024-001567',
      body: `Dear City of Houston Permit Office,

I am writing to inquire about the current status of permit application BP-2024-001567 for the Downtown Office Tower project, submitted 22 days ago.

Could you please provide an update on:
1. Current review status
2. Estimated completion date
3. Any pending requirements or corrections needed

Thank you for your assistance.

Best regards,
[Your Name]
[Company Name]`,
      recipient: 'permits@houstontx.gov',
      recipientName: 'City of Houston Permit Office',
      templateType: 'status-check',
      createdBy: 'agent',
      status: 'draft',
    },
  ]);

  console.log('✓ 3 email drafts inserted');
  console.log('\n✅ Done.');
  await client.end();
}

seedEmails().catch((err) => {
  console.error('Failed:', err.message);
  client.end();
  process.exit(1);
});
