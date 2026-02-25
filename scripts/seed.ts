/**
 * Seed script — populates Neon with demo data matching the UI prototype.
 * Run with: npx tsx scripts/seed.ts
 */
import { loadEnvConfig } from '@next/env';
import path from 'path';
loadEnvConfig(path.resolve(__dirname, '..'));

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../src/lib/db/schema';

const {
  projects, permits, tasks, rules, users,
  inspections, auditLog,
} = schema;

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) throw new Error('DATABASE_URL not set');

const client = postgres(DB_URL);
const db = drizzle(client, { schema });

async function seed() {
  console.log('🌱 Seeding database...');

  // Users
  const [pm1, pm2] = await db.insert(users).values([
    { name: 'Sarah Chen', email: 'sarah@permitiq.dev', role: 'pm' },
    { name: 'Marcus Williams', email: 'marcus@permitiq.dev', role: 'pm' },
  ]).returning();

  console.log('✓ Users');

  // Projects
  const [proj1, proj2, proj3, proj4, proj5] = await db.insert(projects).values([
    { name: 'Downtown Office Tower', client: 'Maxx Builders', status: 'active', dailyCarryingCost: '4200' },
    { name: 'Memorial Hospital Wing', client: 'Anslow-Bryant', status: 'active', dailyCarryingCost: '6800' },
    { name: 'Westside Retail Center', client: "O'Donnell/Snider", status: 'active', dailyCarryingCost: '2900' },
    { name: 'University Science Building', client: 'SpawGlass', status: 'active', dailyCarryingCost: '3500' },
    { name: 'Airport Terminal Expansion', client: 'Linbeck Group', status: 'active', dailyCarryingCost: '8100' },
  ]).returning();

  console.log('✓ Projects');

  // Helper — days from now
  const daysFromNow = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d;
  };
  const daysAgo = (n: number) => daysFromNow(-n);

  // Permits
  const [p1, p2, p3, p4, p5, p6, p7] = await db.insert(permits).values([
    {
      projectId: proj1.id,
      name: 'Building Permit - Foundation',
      type: 'Building',
      jurisdiction: 'Houston',
      authority: 'City of Houston - PWE',
      permitNumber: 'BP-2024-001234',
      status: 'under-review',
      daysInQueue: 12,
      submittedAt: daysAgo(12),
      expiryDate: daysFromNow(45),
      feeBudgeted: '3200',
    },
    {
      projectId: proj2.id,
      name: 'Electrical Permit - Main Panel',
      type: 'Electrical',
      jurisdiction: 'Harris County',
      authority: 'HCPID',
      permitNumber: 'EP-2024-005678',
      status: 'info-requested',
      daysInQueue: 28,
      submittedAt: daysAgo(28),
      expiryDate: daysFromNow(15),
      feeBudgeted: '1850',
    },
    {
      projectId: proj3.id,
      name: 'Plumbing Permit - Water Lines',
      type: 'Plumbing',
      jurisdiction: 'Houston',
      authority: 'City of Houston - PWE',
      permitNumber: 'PP-2024-003456',
      status: 'approved',
      daysInQueue: 8,
      submittedAt: daysAgo(8),
      expiryDate: daysFromNow(120),
      feeBudgeted: '950',
      feeActual: '980',
    },
    {
      projectId: proj4.id,
      name: 'HVAC Permit - Ductwork',
      type: 'Mechanical',
      jurisdiction: 'Austin',
      authority: 'City of Austin - DSD',
      permitNumber: 'MP-2024-007890',
      status: 'pending',
      daysInQueue: 35,
      submittedAt: daysAgo(35),
      expiryDate: daysFromNow(7),
      feeBudgeted: '2100',
    },
    {
      projectId: proj5.id,
      name: 'Fire Alarm Permit',
      type: 'Fire',
      jurisdiction: 'Houston',
      authority: 'Houston Fire Department',
      permitNumber: 'FP-2024-002345',
      status: 'under-review',
      daysInQueue: 5,
      submittedAt: daysAgo(5),
      expiryDate: null,
      feeBudgeted: '750',
    },
    {
      projectId: proj1.id,
      name: 'Structural Permit - Steel Frame',
      type: 'Building',
      jurisdiction: 'Houston',
      authority: 'City of Houston - PWE',
      permitNumber: 'BP-2024-001567',
      status: 'under-review',
      daysInQueue: 22,
      submittedAt: daysAgo(22),
      expiryDate: daysFromNow(25),
      feeBudgeted: '4400',
    },
    {
      projectId: proj3.id,
      name: 'Electrical Permit - Sub-panels',
      type: 'Electrical',
      jurisdiction: 'Houston',
      authority: 'City of Houston - PWE',
      permitNumber: 'EP-2024-005890',
      status: 'pending',
      daysInQueue: 3,
      submittedAt: daysAgo(3),
      expiryDate: daysFromNow(90),
      feeBudgeted: '1200',
    },
  ]).returning();

  console.log('✓ Permits');

  // Rules
  await db.insert(rules).values([
    {
      name: 'Overdue Escalation',
      description: 'Permit exceeds jurisdiction average by 20+ days',
      triggerCondition: 'days_in_queue > avg_days + 20',
      actionTemplate: 'Create urgent task + draft escalation email',
      enabled: true,
      tasksCreated: 4,
    },
    {
      name: 'Slow Review Alert',
      description: 'Permit exceeds jurisdiction average review time',
      triggerCondition: 'days_in_queue > avg_days',
      actionTemplate: 'Create high-priority task + Slack alert',
      enabled: true,
      tasksCreated: 12,
    },
    {
      name: 'Info Request Response',
      description: 'Portal status changed to info requested',
      triggerCondition: "status = 'info-requested'",
      actionTemplate: 'Create urgent task with AHJ deadline',
      enabled: true,
      tasksCreated: 7,
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
      tasksCreated: 9,
    },
    {
      name: 'Expiry Warning',
      description: 'Permit expires within 30 days',
      triggerCondition: 'days_until_expiry <= 30',
      actionTemplate: 'Create high-priority renewal task',
      enabled: true,
      tasksCreated: 2,
    },
  ]);

  console.log('✓ Rules');

  // Tasks
  await db.insert(tasks).values([
    {
      projectId: proj2.id,
      permitId: p2.id,
      title: 'Respond to HCPID info request — electrical load calcs needed',
      type: 'auto',
      priority: 'urgent',
      assignee: pm1.id,
      dueDate: daysFromNow(3),
      status: 'pending',
      notes: 'HCPID requested updated electrical load calculations. Deadline is 10 days from request.',
    },
    {
      projectId: proj4.id,
      permitId: p4.id,
      title: 'Follow up: HVAC permit 35 days — exceeds Austin avg by 17d',
      type: 'auto',
      priority: 'high',
      assignee: pm2.id,
      dueDate: daysFromNow(2),
      status: 'pending',
    },
    {
      projectId: proj1.id,
      permitId: p6.id,
      title: 'Escalate steel frame permit — 22 days, approaching threshold',
      type: 'auto',
      priority: 'high',
      assignee: pm1.id,
      dueDate: daysFromNow(5),
      status: 'pending',
    },
    {
      projectId: proj2.id,
      permitId: p2.id,
      title: 'Renew EP-2024-005678 — expires in 15 days',
      type: 'auto',
      priority: 'urgent',
      assignee: pm1.id,
      dueDate: daysFromNow(10),
      status: 'pending',
      notes: 'Critical: permit expiry imminent. Contact HCPID to request extension.',
    },
    {
      projectId: proj1.id,
      permitId: p1.id,
      title: 'Upload revised foundation drawings to Houston portal',
      type: 'manual',
      priority: 'high',
      assignee: pm1.id,
      dueDate: daysFromNow(7),
      status: 'pending',
    },
    {
      projectId: proj3.id,
      permitId: p3.id,
      title: 'Schedule final plumbing inspection',
      type: 'manual',
      priority: 'medium',
      assignee: pm2.id,
      dueDate: daysFromNow(14),
      status: 'completed',
    },
    {
      projectId: proj5.id,
      permitId: p5.id,
      title: 'Confirm HFD plan review appointment',
      type: 'manual',
      priority: 'medium',
      assignee: pm2.id,
      dueDate: daysFromNow(10),
      status: 'pending',
    },
  ]);

  console.log('✓ Tasks');

  // Inspections
  await db.insert(inspections).values([
    {
      permitId: p1.id,
      type: 'Foundation',
      scheduledDate: daysFromNow(10),
      result: null,
      inspectorName: 'Tom Rivera',
      inspectorContact: 'trivera@houstontx.gov',
    },
    {
      permitId: p3.id,
      type: 'Rough-in Plumbing',
      scheduledDate: daysAgo(5),
      result: 'pass',
      inspectorName: 'Janet Okafor',
      inspectorContact: 'jokafor@houstontx.gov',
      notes: 'All lines pressure-tested, passed.',
    },
    {
      permitId: p3.id,
      type: 'Final Plumbing',
      scheduledDate: daysFromNow(14),
      result: null,
      inspectorName: 'Janet Okafor',
      inspectorContact: 'jokafor@houstontx.gov',
    },
    {
      permitId: p4.id,
      type: 'Mechanical Rough-in',
      scheduledDate: daysFromNow(20),
      result: null,
      inspectorName: null,
      inspectorContact: null,
    },
  ]);

  console.log('✓ Inspections');

  // Audit log
  await db.insert(auditLog).values([
    {
      permitId: p3.id,
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
      timestamp: daysAgo(3),
    },
    {
      permitId: p2.id,
      actorType: 'agent',
      action: 'rule_triggered',
      newValue: 'Rule: Info Request Response → task created',
      timestamp: daysAgo(3),
    },
    {
      permitId: p4.id,
      actorType: 'agent',
      action: 'rule_triggered',
      newValue: 'Rule: Slow Review Alert → task created',
      timestamp: daysAgo(1),
    },
  ]);

  console.log('✓ Audit log');
  console.log('\n✅ Seed complete — database is ready.');

  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  client.end();
  process.exit(1);
});
