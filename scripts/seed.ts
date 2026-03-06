/**
 * Seed script — populates Neon with realistic Houston market demo data.
 * Tailored for Maxx Builders pilot demo with real jurisdictions and permit types.
 * Run with: npx tsx scripts/seed.ts
 */
import { loadEnvConfig } from '@next/env';
import path from 'path';
loadEnvConfig(path.resolve(__dirname, '..'));

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import * as schema from '../src/lib/db/schema';

const {
  projects, permits, tasks, rules, users,
  inspections, auditLog, emailDrafts,
} = schema;

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) throw new Error('DATABASE_URL not set');

const client = postgres(DB_URL);
const db = drizzle(client, { schema });

// Helper — date math
const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};
const daysAgo = (n: number) => daysFromNow(-n);

async function seed() {
  console.log('Seeding database with Houston market demo data...');

  // ── Users ──────────────────────────────────────────────────────
  const ownerHash = await bcrypt.hash('permitiq-dev', 12);
  const [owner] = await db.insert(users).values({
    name: 'Mike Torres',
    email: 'admin@permitiq.dev',
    role: 'owner',
    passwordHash: ownerHash,
    isActive: true,
  }).onConflictDoUpdate({
    target: users.email,
    set: { passwordHash: ownerHash, isActive: true, role: 'owner', name: 'Mike Torres' },
  }).returning();

  const pmHash = await bcrypt.hash('permitiq-dev', 12);
  const [pm1, pm2, pm3] = await db.insert(users).values([
    { name: 'Sarah Chen', email: 'sarah@permitiq.dev', role: 'pm' as const, passwordHash: pmHash, isActive: true },
    { name: 'Marcus Williams', email: 'marcus@permitiq.dev', role: 'pm' as const, passwordHash: pmHash, isActive: true },
    { name: 'Jessica Reyes', email: 'jessica@permitiq.dev', role: 'pm' as const, passwordHash: pmHash, isActive: true },
  ]).onConflictDoUpdate({
    target: users.email,
    set: { isActive: true },
  }).returning();

  void owner;
  console.log('  Users (admin@permitiq.dev / permitiq-dev)');

  // ── Projects (Real Houston-area Maxx Builders style) ───────────
  const [proj1, proj2, proj3, proj4, proj5, proj6] = await db.insert(projects).values([
    {
      name: 'Heights Medical Plaza',
      client: 'Maxx Builders',
      status: 'active',
      dailyCarryingCost: '4850',
    },
    {
      name: 'Katy Freeway Retail Center',
      client: 'Maxx Builders',
      status: 'active',
      dailyCarryingCost: '3200',
    },
    {
      name: 'Sugar Land Town Square Hotel',
      client: 'Maxx Builders',
      status: 'active',
      dailyCarryingCost: '6100',
    },
    {
      name: 'Pearland Medical Office Bldg',
      client: 'Anslow-Bryant',
      status: 'active',
      dailyCarryingCost: '3800',
    },
    {
      name: 'Woodlands Mixed-Use Phase II',
      client: "O'Donnell/Snider",
      status: 'active',
      dailyCarryingCost: '7200',
    },
    {
      name: 'Memorial Hermann Clinic TI',
      client: 'SpawGlass',
      status: 'active',
      dailyCarryingCost: '2400',
    },
  ]).returning();

  console.log('  Projects (6 Houston-area)');

  // ── Permits (realistic Houston jurisdictions & permit numbers) ──
  const [p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13, p14, p15] = await db.insert(permits).values([
    // Heights Medical Plaza — City of Houston
    {
      projectId: proj1.id,
      name: 'New Construction - Medical Office (3-Story)',
      type: 'Building',
      jurisdiction: 'City of Houston',
      authority: 'City of Houston - Public Works & Engineering',
      permitNumber: 'CB25-03847',
      status: 'under-review',
      daysInQueue: 18,
      submittedAt: daysAgo(18),
      expiryDate: daysFromNow(180),
      feeBudgeted: '12400',
    },
    {
      projectId: proj1.id,
      name: 'Electrical - Main Switchgear & Distribution',
      type: 'Electrical',
      jurisdiction: 'City of Houston',
      authority: 'City of Houston - Public Works & Engineering',
      permitNumber: 'CE25-11293',
      status: 'info-requested',
      daysInQueue: 32,
      submittedAt: daysAgo(32),
      expiryDate: daysFromNow(60),
      feeBudgeted: '3850',
    },
    {
      projectId: proj1.id,
      name: 'Fire Alarm & Suppression System',
      type: 'Fire',
      jurisdiction: 'City of Houston',
      authority: 'Houston Fire Department - Fire Marshal',
      permitNumber: 'CF25-04521',
      status: 'under-review',
      daysInQueue: 14,
      submittedAt: daysAgo(14),
      expiryDate: null,
      feeBudgeted: '2200',
    },
    {
      projectId: proj1.id,
      name: 'Plumbing - Medical Gas & Domestic Water',
      type: 'Plumbing',
      jurisdiction: 'City of Houston',
      authority: 'City of Houston - Public Works & Engineering',
      permitNumber: 'CP25-07834',
      status: 'approved',
      daysInQueue: 11,
      submittedAt: daysAgo(22),
      expiryDate: daysFromNow(365),
      feeBudgeted: '1950',
      feeActual: '2050',
    },

    // Katy Freeway Retail Center — Harris County + City of Houston
    {
      projectId: proj2.id,
      name: 'Shell Building - Retail Strip (12,000 SF)',
      type: 'Building',
      jurisdiction: 'Harris County',
      authority: 'Harris County Permits Office',
      permitNumber: 'HC25-BLD-08821',
      status: 'under-review',
      daysInQueue: 25,
      submittedAt: daysAgo(25),
      expiryDate: daysFromNow(90),
      feeBudgeted: '7600',
    },
    {
      projectId: proj2.id,
      name: 'HVAC - RTU Installation (6 Units)',
      type: 'Mechanical',
      jurisdiction: 'Harris County',
      authority: 'Harris County Permits Office',
      permitNumber: 'HC25-MEC-03392',
      status: 'pending',
      daysInQueue: 8,
      submittedAt: daysAgo(8),
      expiryDate: daysFromNow(120),
      feeBudgeted: '2100',
    },
    {
      projectId: proj2.id,
      name: 'Grease Trap & Plumbing - Restaurant Tenant',
      type: 'Plumbing',
      jurisdiction: 'Harris County',
      authority: 'Harris County Permits Office',
      permitNumber: 'HC25-PLM-05567',
      status: 'corrections-required',
      daysInQueue: 41,
      submittedAt: daysAgo(41),
      expiryDate: daysFromNow(30),
      feeBudgeted: '1400',
    },

    // Sugar Land Town Square Hotel — City of Sugar Land
    {
      projectId: proj3.id,
      name: 'New Construction - 5-Story Hotel (120 Keys)',
      type: 'Building',
      jurisdiction: 'City of Sugar Land',
      authority: 'Sugar Land Development Services',
      permitNumber: 'SL25-NB-00412',
      status: 'under-review',
      daysInQueue: 45,
      submittedAt: daysAgo(45),
      expiryDate: daysFromNow(180),
      feeBudgeted: '28500',
    },
    {
      projectId: proj3.id,
      name: 'Elevator Installation (2 Passenger + 1 Service)',
      type: 'Building',
      jurisdiction: 'State of Texas',
      authority: 'TDLR - Elevator Division',
      permitNumber: 'TDLR-ELV-2025-88432',
      status: 'pending',
      daysInQueue: 15,
      submittedAt: daysAgo(15),
      expiryDate: null,
      feeBudgeted: '4200',
    },
    {
      projectId: proj3.id,
      name: 'Fire Sprinkler System - Hotel',
      type: 'Fire',
      jurisdiction: 'Fort Bend County',
      authority: 'Fort Bend County Fire Marshal',
      permitNumber: 'FBC25-FP-01193',
      status: 'info-requested',
      daysInQueue: 28,
      submittedAt: daysAgo(28),
      expiryDate: daysFromNow(45),
      feeBudgeted: '5600',
    },

    // Pearland Medical Office — City of Pearland
    {
      projectId: proj4.id,
      name: 'Tenant Improvement - Medical Office (8,200 SF)',
      type: 'Building',
      jurisdiction: 'City of Pearland',
      authority: 'Pearland Community Development',
      permitNumber: 'PL25-COM-02847',
      status: 'approved',
      daysInQueue: 14,
      submittedAt: daysAgo(21),
      expiryDate: daysFromNow(365),
      feeBudgeted: '4100',
      feeActual: '4100',
    },
    {
      projectId: proj4.id,
      name: 'Mechanical - AHU & Ductwork Modifications',
      type: 'Mechanical',
      jurisdiction: 'City of Pearland',
      authority: 'Pearland Community Development',
      permitNumber: 'PL25-MEC-01122',
      status: 'under-review',
      daysInQueue: 10,
      submittedAt: daysAgo(10),
      expiryDate: daysFromNow(120),
      feeBudgeted: '1800',
    },

    // Woodlands Mixed-Use — The Woodlands Township / Montgomery County
    {
      projectId: proj5.id,
      name: 'Mixed-Use Building - 4-Story (Retail + Office)',
      type: 'Building',
      jurisdiction: 'Montgomery County',
      authority: 'Montgomery County Permits',
      permitNumber: 'MC25-COM-04471',
      status: 'under-review',
      daysInQueue: 38,
      submittedAt: daysAgo(38),
      expiryDate: daysFromNow(120),
      feeBudgeted: '18900',
    },
    {
      projectId: proj5.id,
      name: 'Site Work & Detention Pond',
      type: 'Building',
      jurisdiction: 'Montgomery County',
      authority: 'MC Engineering / San Jacinto River Authority',
      permitNumber: 'MC25-CIV-02238',
      status: 'corrections-required',
      daysInQueue: 52,
      submittedAt: daysAgo(52),
      expiryDate: daysFromNow(14),
      feeBudgeted: '6500',
    },

    // Memorial Hermann Clinic TI — City of Houston
    {
      projectId: proj6.id,
      name: 'Tenant Improvement - Clinic Suite (4,500 SF)',
      type: 'Building',
      jurisdiction: 'City of Houston',
      authority: 'City of Houston - Public Works & Engineering',
      permitNumber: 'CB25-09112',
      status: 'approved',
      daysInQueue: 9,
      submittedAt: daysAgo(16),
      expiryDate: daysFromNow(365),
      feeBudgeted: '2800',
      feeActual: '2800',
    },
  ]).returning();

  console.log('  Permits (15 across 6 projects, 7 jurisdictions)');

  // ── Rules ──────────────────────────────────────────────────────
  await db.insert(rules).values([
    {
      name: 'Overdue Escalation',
      description: 'Permit exceeds jurisdiction average by 20+ days',
      triggerCondition: 'days_in_queue > avg_days + 20',
      actionTemplate: 'Create urgent task + draft escalation email',
      enabled: true,
      tasksCreated: 6,
    },
    {
      name: 'Slow Review Alert',
      description: 'Permit exceeds jurisdiction average review time',
      triggerCondition: 'days_in_queue > avg_days',
      actionTemplate: 'Create high-priority task + Slack alert',
      enabled: true,
      tasksCreated: 14,
    },
    {
      name: 'Info Request Response',
      description: 'Portal status changed to info requested',
      triggerCondition: "status = 'info-requested'",
      actionTemplate: 'Create urgent task with AHJ deadline',
      enabled: true,
      tasksCreated: 8,
    },
    {
      name: 'Hearing Prep Reminder',
      description: 'Hearing scheduled within 14 days',
      triggerCondition: 'days_until_hearing <= 14',
      actionTemplate: 'Create prep docs + public notice tasks',
      enabled: true,
      tasksCreated: 3,
    },
    {
      name: 'Approval Archive',
      description: 'Permit status changed to approved',
      triggerCondition: "status = 'approved'",
      actionTemplate: 'Archive permit + Slack notification',
      enabled: true,
      tasksCreated: 11,
    },
    {
      name: 'Expiry Warning',
      description: 'Permit expires within 30 days',
      triggerCondition: 'days_until_expiry <= 30',
      actionTemplate: 'Create high-priority renewal task',
      enabled: true,
      tasksCreated: 4,
    },
  ]);

  console.log('  Rules (6)');

  // ── Tasks ──────────────────────────────────────────────────────
  await db.insert(tasks).values([
    // Auto-generated from rules
    {
      projectId: proj1.id,
      permitId: p2.id,
      title: 'Respond to COH info request — updated load calc schedule required',
      type: 'auto',
      priority: 'urgent',
      assignee: pm1.id,
      dueDate: daysFromNow(3),
      status: 'pending',
      notes: 'City of Houston requested revised electrical load calculations showing medical equipment loads. 10-day deadline from request date.',
    },
    {
      projectId: proj3.id,
      permitId: p10.id,
      title: 'Respond to Fort Bend Fire Marshal — hydraulic calcs needed',
      type: 'auto',
      priority: 'urgent',
      assignee: pm3.id,
      dueDate: daysFromNow(5),
      status: 'pending',
      notes: 'FBC Fire Marshal requires updated hydraulic calculations for hotel sprinkler system. Submit via ePlans portal.',
    },
    {
      projectId: proj3.id,
      permitId: p8.id,
      title: 'Escalate Sugar Land hotel permit — 45 days, exceeds avg by 27d',
      type: 'auto',
      priority: 'urgent',
      assignee: pm1.id,
      dueDate: daysFromNow(1),
      status: 'pending',
      notes: 'Sugar Land avg for new construction is 18 days. This permit is at 45 days. Contact Development Services director.',
    },
    {
      projectId: proj5.id,
      permitId: p14.id,
      title: 'Resubmit corrected detention pond calcs — MC Engineering',
      type: 'auto',
      priority: 'high',
      assignee: pm2.id,
      dueDate: daysFromNow(7),
      status: 'pending',
      notes: 'Montgomery County returned site work plans with corrections. Detention pond volume calculations do not meet SJRA requirements.',
    },
    {
      projectId: proj2.id,
      permitId: p7.id,
      title: 'Resubmit grease trap plans — Harris County corrections',
      type: 'auto',
      priority: 'high',
      assignee: pm2.id,
      dueDate: daysFromNow(4),
      status: 'pending',
      notes: 'Harris County requires grease interceptor sizing per UPC Table 10-3. Current design undersized for restaurant tenant.',
    },
    {
      projectId: proj5.id,
      permitId: p14.id,
      title: 'Renew site work permit — expires in 14 days',
      type: 'auto',
      priority: 'urgent',
      assignee: pm2.id,
      dueDate: daysFromNow(10),
      status: 'pending',
      notes: 'MC25-CIV-02238 expires soon. Must resubmit or request extension before expiry.',
    },
    // Manual tasks
    {
      projectId: proj1.id,
      permitId: p1.id,
      title: 'Upload revised foundation engineering to COH ePlans',
      type: 'manual',
      priority: 'high',
      assignee: pm1.id,
      dueDate: daysFromNow(7),
      status: 'pending',
    },
    {
      projectId: proj2.id,
      permitId: p5.id,
      title: 'Schedule pre-construction meeting with Harris County inspector',
      type: 'manual',
      priority: 'medium',
      assignee: pm2.id,
      dueDate: daysFromNow(14),
      status: 'pending',
    },
    {
      projectId: proj4.id,
      permitId: p11.id,
      title: 'Coordinate MEP rough-in inspection with Pearland',
      type: 'manual',
      priority: 'medium',
      assignee: pm3.id,
      dueDate: daysFromNow(10),
      status: 'completed',
    },
    {
      projectId: proj6.id,
      permitId: p15.id,
      title: 'Submit approved plans to Memorial Hermann facilities',
      type: 'manual',
      priority: 'low',
      assignee: pm3.id,
      dueDate: daysFromNow(5),
      status: 'pending',
    },
    {
      projectId: proj3.id,
      permitId: p9.id,
      title: 'Follow up with TDLR on elevator permit timeline',
      type: 'manual',
      priority: 'medium',
      assignee: pm1.id,
      dueDate: daysFromNow(7),
      status: 'pending',
    },
  ]);

  console.log('  Tasks (11 — 6 auto, 5 manual)');

  // ── Inspections ────────────────────────────────────────────────
  await db.insert(inspections).values([
    {
      permitId: p4.id,
      type: 'Underground Plumbing',
      scheduledDate: daysAgo(8),
      result: 'pass',
      inspectorName: 'Tom Rivera',
      inspectorContact: 'trivera@houstontx.gov',
      notes: 'All underground water and waste lines passed pressure test.',
    },
    {
      permitId: p4.id,
      type: 'Rough-in Plumbing',
      scheduledDate: daysAgo(3),
      result: 'pass',
      inspectorName: 'Tom Rivera',
      inspectorContact: 'trivera@houstontx.gov',
      notes: 'Medical gas lines tested per NFPA 99. Passed.',
    },
    {
      permitId: p1.id,
      type: 'Foundation',
      scheduledDate: daysFromNow(12),
      result: null,
      inspectorName: 'James Whitfield',
      inspectorContact: 'jwhitfield@houstontx.gov',
    },
    {
      permitId: p11.id,
      type: 'Framing',
      scheduledDate: daysAgo(2),
      result: 'pass',
      inspectorName: 'Robert Garza',
      inspectorContact: 'rgarza@pearlandtx.gov',
      notes: 'Steel stud framing and fire-rated assemblies verified.',
    },
    {
      permitId: p11.id,
      type: 'MEP Rough-in',
      scheduledDate: daysFromNow(8),
      result: null,
      inspectorName: 'Robert Garza',
      inspectorContact: 'rgarza@pearlandtx.gov',
    },
    {
      permitId: p15.id,
      type: 'Final',
      scheduledDate: daysFromNow(18),
      result: null,
      inspectorName: 'Janet Okafor',
      inspectorContact: 'jokafor@houstontx.gov',
    },
    {
      permitId: p5.id,
      type: 'Foundation',
      scheduledDate: daysFromNow(25),
      result: null,
      inspectorName: null,
      inspectorContact: null,
    },
    {
      permitId: p8.id,
      type: 'Foundation',
      scheduledDate: daysFromNow(30),
      result: null,
      inspectorName: null,
      inspectorContact: null,
      notes: 'Pending permit approval — tentative date.',
    },
  ]);

  console.log('  Inspections (8 — 3 completed, 5 scheduled)');

  // ── Audit Log ──────────────────────────────────────────────────
  await db.insert(auditLog).values([
    {
      permitId: p4.id,
      actorType: 'agent',
      action: 'status_changed',
      oldValue: 'under-review',
      newValue: 'approved',
      timestamp: daysAgo(4),
    },
    {
      permitId: p11.id,
      actorType: 'agent',
      action: 'status_changed',
      oldValue: 'under-review',
      newValue: 'approved',
      timestamp: daysAgo(3),
    },
    {
      permitId: p15.id,
      actorType: 'agent',
      action: 'status_changed',
      oldValue: 'under-review',
      newValue: 'approved',
      timestamp: daysAgo(2),
    },
    {
      permitId: p2.id,
      actorType: 'agent',
      action: 'status_changed',
      oldValue: 'under-review',
      newValue: 'info-requested',
      timestamp: daysAgo(5),
    },
    {
      permitId: p2.id,
      actorType: 'agent',
      action: 'rule_triggered',
      newValue: 'Rule: Info Request Response — task created for Sarah Chen',
      timestamp: daysAgo(5),
    },
    {
      permitId: p10.id,
      actorType: 'agent',
      action: 'status_changed',
      oldValue: 'under-review',
      newValue: 'info-requested',
      timestamp: daysAgo(3),
    },
    {
      permitId: p10.id,
      actorType: 'agent',
      action: 'rule_triggered',
      newValue: 'Rule: Info Request Response — task created for Jessica Reyes',
      timestamp: daysAgo(3),
    },
    {
      permitId: p7.id,
      actorType: 'agent',
      action: 'status_changed',
      oldValue: 'under-review',
      newValue: 'corrections-required',
      timestamp: daysAgo(6),
    },
    {
      permitId: p14.id,
      actorType: 'agent',
      action: 'status_changed',
      oldValue: 'under-review',
      newValue: 'corrections-required',
      timestamp: daysAgo(8),
    },
    {
      permitId: p8.id,
      actorType: 'agent',
      action: 'rule_triggered',
      newValue: 'Rule: Overdue Escalation — 45 days exceeds Sugar Land avg (18d) by 27 days',
      timestamp: daysAgo(1),
    },
    {
      permitId: p14.id,
      actorType: 'agent',
      action: 'rule_triggered',
      newValue: 'Rule: Expiry Warning — MC25-CIV-02238 expires in 14 days',
      timestamp: daysAgo(1),
    },
  ]);

  console.log('  Audit log (11 entries)');

  // ── Email Drafts ───────────────────────────────────────────────
  await db.insert(emailDrafts).values([
    {
      permitId: p8.id,
      subject: 'Expedited Review Request - Permit SL25-NB-00412 (Sugar Land Town Square Hotel)',
      body: `Dear Sugar Land Development Services,

I am writing to request an expedited review of permit application SL25-NB-00412 for the Sugar Land Town Square Hotel project.

This application has been under review for 45 days, which significantly exceeds the typical 18-day processing time for new construction permits in your jurisdiction. The delay is causing substantial schedule impact and daily carrying costs.

Project Details:
- Project: Sugar Land Town Square Hotel (120 Keys, 5-Story)
- Permit Type: New Construction - Building
- Submitted: ${daysAgo(45).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
- General Contractor: Maxx Builders

We have not received any correction notices or requests for additional information, so we believe all submittal requirements have been met.

Could you please provide:
1. Current review status and any outstanding items
2. Estimated completion date for plan review
3. Whether an in-person meeting with the plan reviewer would help expedite

Thank you for your attention to this matter.

Best regards,
[Your Name]
Maxx Builders
[Phone]`,
      recipient: 'permits@sugarlandtx.gov',
      recipientName: 'Sugar Land Development Services',
      templateType: 'escalation',
      createdBy: 'agent',
      status: 'pending-review',
    },
    {
      permitId: p2.id,
      subject: 'Re: Additional Information Required - Permit CE25-11293',
      body: `Dear City of Houston Plan Review,

Thank you for your review of permit application CE25-11293 for the Heights Medical Plaza project.

In response to your request, we are preparing the revised electrical load calculations incorporating the updated medical equipment schedule. Specifically:

1. Updated NEC Article 220 load calculations reflecting medical imaging equipment (MRI, CT, X-ray)
2. Revised panel schedules showing dedicated circuits per NEC 517
3. Emergency power distribution updated per NFPA 110

We anticipate submitting the revised documents within 5 business days via ePlans.

Please let us know if additional information is needed.

Best regards,
[Your Name]
Maxx Builders`,
      recipient: 'permits@houstontx.gov',
      recipientName: 'City of Houston Plan Review',
      templateType: 'info-response',
      createdBy: 'agent',
      status: 'pending-review',
    },
    {
      permitId: p13.id,
      subject: 'Status Inquiry - Permit MC25-COM-04471 (Woodlands Mixed-Use Phase II)',
      body: `Dear Montgomery County Permits,

I am writing to inquire about the current status of permit application MC25-COM-04471 for the Woodlands Mixed-Use Phase II project, submitted 38 days ago.

Could you please provide an update on:
1. Current review status and reviewer assignment
2. Estimated completion date for plan review
3. Any pending requirements or corrections needed

The project team is available for a plan review meeting at your convenience if that would help resolve any open questions.

Thank you for your assistance.

Best regards,
[Your Name]
O'Donnell/Snider Construction`,
      recipient: 'permits@mctx.org',
      recipientName: 'Montgomery County Permits',
      templateType: 'status-check',
      createdBy: 'agent',
      status: 'draft',
    },
  ]);

  console.log('  Email drafts (3 — 2 pending review, 1 draft)');
  console.log('\nSeed complete — database is ready for demo.');
  console.log('Login: admin@permitiq.dev / permitiq-dev');

  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  client.end();
  process.exit(1);
});
