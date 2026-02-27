import { pgTable, text, timestamp, integer, boolean, decimal, uuid, unique, primaryKey } from 'drizzle-orm/pg-core';

// Projects table
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  client: text('client'),
  status: text('status').notNull().default('active'), // active, on-hold, completed
  dailyCarryingCost: decimal('daily_carrying_cost', { precision: 10, scale: 2 }),
  procoreId: text('procore_id'),
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
  procoreItemId: text('procore_item_id'),
  submissionStatus: text('submission_status').notNull().default('draft'), // draft | submitted | under-review | corrections-required | approved
  submissionDeadline: timestamp('submission_deadline'),
  correctionNotes: text('correction_notes'),
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
  emailVerified: timestamp('email_verified'),
  role: text('role').notNull().default('pm'), // owner, admin, pm, superintendent, teammate
  teamId: uuid('team_id'),
  passwordHash: text('password_hash'),
  inviteToken: text('invite_token'),
  inviteExpiry: timestamp('invite_expiry'),
  isActive: boolean('is_active').default(true).notNull(),
  // Notification preferences
  telegramChatId: text('telegram_chat_id'),    // Telegram user/chat ID for bot messages
  phoneNumber: text('phone_number'),            // E.164 format for SMS (e.g. +15551234567)
  notificationChannel: text('notification_channel').default('none'), // 'telegram'|'sms'|'both'|'none'
  notifyEvents: text('notify_events').default('["permit.status","inspection.fail","expiry","daily.digest"]'), // JSON array
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Project members table (project-level access scoping)
export const projectMembers = pgTable('project_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Integrations table (OAuth tokens for Procore, Buildertrend, Zapier)
export const integrations = pgTable('integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  provider: text('provider').notNull(), // procore | buildertrend | zapier
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at'),
  providerData: text('provider_data'), // JSON string (companyId, lastSync, etc.)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({ userProviderUnique: unique().on(t.userId, t.provider) }));

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

// Submission checklist items table
export const checklistItems = pgTable('checklist_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  permitId: uuid('permit_id').references(() => permits.id, { onDelete: 'cascade' }).notNull(),
  label: text('label').notNull(),
  category: text('category').notNull().default('documents'), // documents | fees | steps
  required: boolean('required').default(true).notNull(),
  completed: boolean('completed').default(false).notNull(),
  completedAt: timestamp('completed_at'),
  completedBy: text('completed_by'),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// OAuth accounts table — required by @auth/drizzle-adapter for Google/Microsoft SSO
export const accounts = pgTable('accounts', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, (t) => ({
  pk: primaryKey({ columns: [t.provider, t.providerAccountId] }),
}));

// API keys table — for Open REST API authentication
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull(),       // SHA-256 of the raw key
  keyPrefix: text('key_prefix').notNull(),   // First 8 chars for display: "piq_ab12"
  scopes: text('scopes').notNull().default('read'), // 'read' | 'read,write'
  lastUsedAt: timestamp('last_used_at'),
  revokedAt: timestamp('revoked_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Registered webhooks — outgoing webhook subscriptions
export const registeredWebhooks = pgTable('registered_webhooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  url: text('url').notNull(),
  events: text('events').notNull(), // JSON array string: ["permit.updated","task.created"]
  secret: text('secret').notNull(), // HMAC secret (auto-generated, shown once)
  active: boolean('active').default(true).notNull(),
  lastDeliveryAt: timestamp('last_delivery_at'),
  failureCount: integer('failure_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Webhook delivery log
export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  webhookId: uuid('webhook_id').references(() => registeredWebhooks.id, { onDelete: 'cascade' }).notNull(),
  event: text('event').notNull(),
  payload: text('payload').notNull(),
  responseStatus: integer('response_status'),
  responseBody: text('response_body'),
  success: boolean('success').default(false).notNull(),
  attemptedAt: timestamp('attempted_at').defaultNow().notNull(),
});

// Market / AHJ (Authority Having Jurisdiction) intelligence database
export const jurisdictions = pgTable('jurisdictions', {
  id: uuid('id').primaryKey().defaultRandom(),
  metro: text('metro').notNull(),           // e.g. "Houston Metro"
  city: text('city').notNull(),             // e.g. "Houston"
  county: text('county'),                   // e.g. "Harris County"
  state: text('state').notNull(),           // e.g. "TX"
  ahjName: text('ahj_name').notNull(),      // e.g. "City of Houston Development Services"
  portalUrl: text('portal_url'),            // Official permit portal URL
  feeScheduleUrl: text('fee_schedule_url'), // Fee schedule PDF/page URL
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  // Average review times by permit type (business days; null = unknown)
  avgReviewDaysBuilding: integer('avg_review_days_building'),
  avgReviewDaysElectrical: integer('avg_review_days_electrical'),
  avgReviewDaysPlumbing: integer('avg_review_days_plumbing'),
  avgReviewDaysMechanical: integer('avg_review_days_mechanical'),
  avgReviewDaysFire: integer('avg_review_days_fire'),
  // Market intelligence
  marketTier: integer('market_tier').notNull().default(2), // 1=most active, 2=high, 3=active
  constructionActivity: text('construction_activity'),     // 'very-high'|'high'|'moderate'
  primarySectors: text('primary_sectors'),                 // JSON array: ["commercial","multifamily","healthcare"]
  permitVolume: text('permit_volume'),                     // Descriptive annual volume
  yoyGrowthPct: decimal('yoy_growth_pct', { precision: 5, scale: 1 }), // YoY % change
  notes: text('notes'),                                    // AHJ-specific tips/notes
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Workspace branding settings — single-row table
export const workspaceSettings = pgTable('workspace_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyName: text('company_name').notNull().default('PermitIQ'),
  logoUrl: text('logo_url'),                              // R2 key or null
  primaryColor: text('primary_color').default('#00e5ff'), // CSS hex
  faviconUrl: text('favicon_url'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: uuid('updated_by').references(() => users.id),
});
