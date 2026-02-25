import { pgTable, text, timestamp, integer, boolean, decimal, uuid } from 'drizzle-orm/pg-core';

// Projects table
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  client: text('client'),
  status: text('status').notNull().default('active'), // active, on-hold, completed
  dailyCarryingCost: decimal('daily_carrying_cost', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Permits table
export const permits = pgTable('permits', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(), // Building, Electrical, Plumbing, Mechanical, Fire
  jurisdiction: text('jurisdiction').notNull(),
  authority: text('authority'), // Specific AHJ name
  permitNumber: text('permit_number'),
  submittedAt: timestamp('submitted_at'),
  status: text('status').notNull().default('pending'), // pending, under-review, info-requested, approved, rejected
  daysInQueue: integer('days_in_queue').default(0),
  expiryDate: timestamp('expiry_date'),
  feeBudgeted: decimal('fee_budgeted', { precision: 10, scale: 2 }),
  feeActual: decimal('fee_actual', { precision: 10, scale: 2 }),
  notes: text('notes'),
  archived: boolean('archived').default(false),
  hearingDate: timestamp('hearing_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Documents table
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  permitId: uuid('permit_id').references(() => permits.id).notNull(),
  type: text('type').notNull(), // Application, Approval, Correction, Inspection Report, Other
  filename: text('filename').notNull(),
  storageUrl: text('storage_url').notNull(),
  size: integer('size'), // file size in bytes
  version: integer('version').default(1),
  uploadedBy: uuid('uploaded_by').references(() => users.id),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
});

// Inspections table
export const inspections = pgTable('inspections', {
  id: uuid('id').primaryKey().defaultRandom(),
  permitId: uuid('permit_id').references(() => permits.id).notNull(),
  type: text('type').notNull(), // framing, rough-in, insulation, final, etc.
  scheduledDate: timestamp('scheduled_date'),
  result: text('result'), // pass, fail, partial
  inspectorName: text('inspector_name'),
  inspectorContact: text('inspector_contact'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Tasks table
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  permitId: uuid('permit_id').references(() => permits.id),
  projectId: uuid('project_id').references(() => projects.id),
  title: text('title').notNull(),
  type: text('type').notNull().default('manual'), // manual, auto
  ruleId: uuid('rule_id').references(() => rules.id),
  priority: text('priority').notNull().default('medium'), // low, medium, high, urgent
  assignee: uuid('assignee').references(() => users.id),
  dueDate: timestamp('due_date'),
  status: text('status').notNull().default('pending'), // pending, in-progress, completed
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Rules table
export const rules = pgTable('rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  triggerCondition: text('trigger_condition').notNull(),
  actionTemplate: text('action_template').notNull(),
  assigneeDefault: uuid('assignee_default').references(() => users.id),
  enabled: boolean('enabled').default(true),
  tasksCreated: integer('tasks_created').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Audit log table
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  permitId: uuid('permit_id').references(() => permits.id),
  actorType: text('actor_type').notNull(), // user, agent
  actorId: uuid('actor_id'),
  action: text('action').notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role').notNull().default('pm'), // owner, admin, pm, superintendent
  teamId: uuid('team_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Email drafts table
export const emailDrafts = pgTable('email_drafts', {
  id: uuid('id').primaryKey().defaultRandom(),
  permitId: uuid('permit_id').references(() => permits.id),
  taskId: uuid('task_id').references(() => tasks.id),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  recipient: text('recipient'),
  recipientName: text('recipient_name'),
  templateType: text('template_type'), // escalation, status-check, info-response, etc.
  createdBy: text('created_by').notNull().default('agent'), // agent | user
  status: text('status').notNull().default('draft'), // draft, pending-review, sent, rejected
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Fees table
export const fees = pgTable('fees', {
  id: uuid('id').primaryKey().defaultRandom(),
  permitId: uuid('permit_id').references(() => permits.id).notNull(),
  type: text('type').notNull(), // base, re-inspection, expedite, plan-check
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  paidAt: timestamp('paid_at'),
  receiptUrl: text('receipt_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
