# PermitIQ — Claude Code Project Memory

> This file is the persistent memory for Claude Code working on the PermitIQ project.
> Load this at the start of every session. It contains full product context, architecture
> decisions, build status, and exact next steps derived from the product roadmap.

---

## What Is PermitIQ

PermitIQ is an AI-powered construction permit tracking and management SaaS. It automates
the most painful part of commercial construction project management: monitoring permit
applications across multiple jurisdictions, catching bottlenecks early, auto-generating
follow-up tasks, and giving project managers real-time answers via an AI chat agent with
live web citations from official municipal sources.

**Target customer:** Mid-size commercial general contractors (GCs) in the $20M–$200M
revenue range operating across multiple jurisdictions simultaneously. They have 5–20 active
projects with 60–80 open permits at any time, no dedicated permit expediter, and no
automated tracking system.

**Primary personas:**
- Project Manager (daily user) — drowning in permit follow-ups, needs status visibility
- VP of Operations / COO (economic buyer) — cares about project delays and cost overruns

**Validated Houston target accounts (outside big five):**
- Maxx Builders (Stafford TX) — Inc. 5000, retail/hospitality/medical, first pilot target
- Anslow-Bryant — 30yr family firm, healthcare/education/institutional, tech-receptive
- O'Donnell/Snider — $179M rev, 153 employees, uses Procore already
- Linbeck Group — healthcare/higher-ed, complex multi-agency permitting
- SpawGlass — employee-owned, aviation/campus/HEB grocery projects statewide
- Arch-Con Corporation — $271M rev, 115 employees, 8+ project types concurrently

---

## Current Product State

### What Is Built (in the dashboard prototype)

The working HTML/CSS/JS prototype (`permit-agent-dashboard.html`) contains:

1. **Dashboard Page** — 3-column layout: project sidebar | permit tracker table | AI chat panel
   - Stat cards: 37 permits tracked, 8 awaiting response, 3 overdue, 7 tasks in queue
   - Permit tracker table with jurisdiction, days-in-queue, status badges, rule badges
   - "Ask Agent" per permit row — fires contextual query to chat agent
   - Quick-assign "+ Task" button per row → drops task into queue immediately
   - Project sidebar with 5 projects and their status badges
   - Next agent run widget (Tue/Fri 9AM schedule)
   - Quick Actions panel

2. **Task Manager Page** — Combined Manual (Method 1) + Auto-Generated (Method 2)
   - Full task queue with filter tabs: All / Manual / Auto-Generated / Urgent / Completed
   - Manual task creation form: title, project, permit type, priority, due date, assignee, notes
   - Auto vs Manual tags (⚡ / ✏️) clearly differentiated
   - Task detail panel: full activity log, status, mark-done, delete
   - Quick-assign from dashboard creates tasks directly in queue
   - Pending count badge updates live in nav tab

3. **Rule Engine Page** — 5 live auto-assignment rules with toggles
   - Rule #1: Overdue Escalation (permit > avg + 20 days → Urgent task → escalation email)
   - Rule #2: Slow Review Alert (permit > jurisdiction avg → High task → Slack alert)
   - Rule #3: Info Request Response (portal status = info requested → Urgent task → set deadline)
   - Rule #4: Hearing Prep Reminder (hearing within 14 days → prep docs + public notice tasks)
   - Rule #5: Approval Archive (permit approved → agent archives + Slack notification)
   - Rule #6: Expiry Warning (disabled, expiry within 30 days — activating in Phase 1)
   - Engine activity stats panel + recent auto-tasks feed
   - "▶ Run Agent" button simulates live scan, fires Rule #2, creates auto-task with toast

4. **AI Chat Agent** — Right panel on Dashboard
   - Connected to Claude API (`claude-sonnet-4-20250514`) with web_search tool enabled
   - Searches official .gov sources, municipal portals, building code databases
   - Returns answers with numbered citations from authoritative sources
   - Citation parsing from CITATIONS: section and bare URLs
   - Auto-labels known government domains (austintexas.gov, hcpid.org, dob.nyc.gov, etc.)
   - Demo fallback responses for Harris County electrical, Austin HVAC, NYC DOB plumbing
   - Suggestion chips on load, typing indicator, searching animation

### Current Build Coverage: 24%

| Feature | Status |
|---|---|
| Permit Tracker Table | ✅ Built |
| Task Manager (Manual) | ✅ Built |
| Rule Engine (Auto-assign) | ✅ Built |
| AI Chat + Live Citations | ✅ Built |
| Document Management | ❌ Missing — Phase 1 |
| Inspection Scheduling & Tracking | ❌ Missing — Phase 2 |
| Fee Tracking & Payment Log | ❌ Missing — Phase 3 |
| Application Submission Workflow | ❌ Missing — Phase 3 |
| Multi-User / Role-Based Access | ❌ Missing — Phase 3 |
| Permit Expiry Tracking | ⚠️ Partial — Phase 1 |
| Cost Impact Calculator | ❌ Missing — Phase 2 |
| Email Draft Review UI | ⚠️ Partial — Phase 2 |
| Audit Trail / Permit History | ❌ Missing — Phase 2 |
| Search & Filter on Permit Table | ❌ Missing — Phase 1 |
| Procore / PM Integration | ❌ Missing — Phase 3 |
| Onboarding Flow & Empty States | ❌ Missing — Phase 1 |
| Mobile Responsive Layout | ❌ Missing — Phase 4 |

---

## 18-Month Build Roadmap

### Phase 1 — Foundation (Weeks 1–8)
*Goal: Close deal-breaker gaps before first demos*

**Sprint 1–2 (Weeks 1–4):**

- [ ] **Document Management System** — CRITICAL
  - File upload & storage per permit (PDF, PNG, DOCX)
  - Document type tagging: Application, Approval, Correction Notice, Inspection Report
  - Version history — track doc revisions over time
  - In-browser preview, download, shareable link generation
  - Storage: S3 or Cloudflare R2 (recommend R2 — no egress fees)

- [ ] **Permit Expiry Tracking & Alerts** — HIGH
  - Expiry date field on every permit record
  - Countdown widget on dashboard (30 / 60 / 90-day warning tiers)
  - Activate Rule #6 in the rule engine (currently disabled)
  - Include expiry section in semi-weekly digest report

**Sprint 3–4 (Weeks 5–8):**

- [ ] **Search & Filter on Permit Table** — HIGH
  - Search bar: permit name, jurisdiction, permit number, status
  - Filter by: project, permit type, status, days-in-queue range
  - Sortable columns (click header to sort asc/desc)
  - Client-side filtering first (fast to ship), server-side search later
  - Saved filter presets per user

- [ ] **Onboarding Flow & Empty States** — HIGH
  - First-run wizard: add project → add permit → configure notifications
  - Empty state UI with guided prompts (no blank tables/screens)
  - Sample data toggle (show demo data to orient new users)
  - In-app tooltip system on key interactive elements

---

### Phase 2 — Intelligence (Weeks 9–20)
*Goal: Convert the product from tracker to intelligence platform*

**Sprint 5–6 (Weeks 9–14):**

- [ ] **Inspection Scheduling & Tracking** — CRITICAL
  - Inspection log per permit: type (framing, MEP rough-in, insulation, final), date, result (pass/fail/partial)
  - Inspection sequence view — ordered list showing required inspection flow
  - Calendar view: upcoming inspections across all projects
  - Auto-task creation when inspection fails (re-inspection task → assigned per rule config)
  - Inspector contact info field per inspection record

- [ ] **Email Draft Review Interface** — CRITICAL
  - Agent-drafted follow-up emails shown in review modal BEFORE sending
  - Edit, approve, or reject draft in one click
  - Template library: escalation, status check, info response, hearing follow-up
  - Sent email log per permit with timestamps, recipient, subject

**Sprint 7–8 (Weeks 15–20):**

- [ ] **Cost Impact Calculator** — HIGH
  - Daily carrying cost field per project (input from project budget)
  - Delay cost auto-calc: days overdue × daily carrying rate
  - Schedule penalty field (from contract — input manually)
  - Cost impact displayed on permit row and included in reports
  - Portfolio-level total delay cost on dashboard

- [ ] **Audit Trail & Permit History** — HIGH
  - Full lifecycle view per permit: every status change timestamped
  - Actor log: which user or agent took what action, when
  - History persists after permit archival (for litigation/CO documentation)
  - Downloadable audit report per permit as PDF

---

### Phase 3 — Scale (Weeks 21–36)
*Goal: Enable team-wide adoption and unlock enterprise sales*

**Sprint 9–11 (Weeks 21–28):**

- [ ] **Multi-User & Role-Based Access** — CRITICAL
  - 4 roles: Owner, Project Manager, Superintendent (field, read-only on inspections), Admin/View-Only
  - Project-level access: PMs only see their assigned projects
  - Team management: invite by email, change roles, remove users
  - Activity log shows which user triggered each action (vs agent)

- [ ] **Fee Tracking & Payment Log** — HIGH
  - Fee entry per permit: base fee, re-inspection fee, expedite surcharge, plan check fee
  - Payment confirmation upload (receipt / bank confirmation)
  - Running fee total per project and across portfolio
  - Fee variance report: budgeted vs actual fees

**Sprint 12–14 (Weeks 29–36):**

- [ ] **Application Submission Workflow** — HIGH
  - Guided checklist per permit type + jurisdiction (dynamic by AHJ)
  - Document checklist builder: required docs listed, track which are uploaded
  - Submission status tracker: Draft → Submitted → Under Review → Corrections Required → Approved
  - Response window tracking: deadline reminders (AHJs typically give 10–30 days to respond)

- [ ] **Procore & PM Tool Integration** — CRITICAL
  - Procore OAuth 2.0 connection — sync projects, import permit records
  - Buildertrend CSV import/export
  - Webhook receiver for external task triggers (POST to PermitIQ from external systems)
  - Zapier connector for non-native integrations

---

### Phase 4 — Enterprise (Weeks 37–52)
*Goal: Unlock national accounts, open reseller channel*

- [ ] Mobile Responsive Layout (React Native or PWA wrapper)
- [ ] Analytics & Executive Dashboard (portfolio-level velocity metrics)
- [ ] Open REST API + Webhook Platform
- [ ] White-label & Multi-tenant Architecture
- [ ] SSO (Google Workspace, Microsoft 365)

---

## Go-to-Market Gates

| Gate | Week | Trigger | Target | KPI |
|---|---|---|---|---|
| First Demo | 8 | Phase 1 complete | Maxx Builders, Anslow-Bryant | 2 pilot customers |
| Paid Pilots | 14 | Inspection tracking + email review live | O'Donnell/Snider, SpawGlass | $15K ARR |
| PMF Gate | 20 | Full Phase 2 | All Houston mid-market | NPS ≥ 40 |
| Enterprise Outreach | 36 | Procore integration | Arch-Con, Linbeck | $150K ARR |
| Raise Ready | 52 | Phase 4 complete | OPMs, CM firms | $2M ARR |

**Pricing model:**
- Pilot: Free 90-day trial (no credit card)
- Growth: $299/mo per project
- Enterprise: $999/mo per project cluster OR $50K/yr flat
- Future: $2M ARR → Series A conversation

---

## Tech Stack (Target Architecture)

```
Frontend:         React (TypeScript) + Tailwind CSS
Backend:          Node.js + Express (or Next.js API routes)
Database:         PostgreSQL (permit records, task queue, audit log)
Cache:            Redis (session, rate limiting, agent scan queue)
File Storage:     Cloudflare R2 (documents) — no egress fees
AI / Agent:       Claude API (claude-sonnet-4-20250514) + web_search tool
Scheduling:       node-cron (semi-weekly agent runs: Tue/Fri 9AM)
Email:            SendGrid (digest reports, follow-up drafts)
Notifications:    Slack Bot API (channel alerts)
Integrations:     Procore OAuth 2.0, Buildertrend CSV, Zapier webhook
Auth:             JWT + role-based middleware
Deployment:       Railway or Render (MVP), then AWS/GCP for enterprise
```

**Database schema — key tables:**
```sql
projects         (id, name, client, status, daily_carrying_cost, created_at)
permits          (id, project_id, type, jurisdiction, authority, permit_number,
                  submitted_at, status, days_in_queue, expiry_date, fee_budgeted,
                  fee_actual, notes)
documents        (id, permit_id, type, filename, storage_url, version, uploaded_by, uploaded_at)
inspections      (id, permit_id, type, scheduled_date, result, inspector_name,
                  inspector_contact, notes, created_at)
tasks            (id, permit_id, project_id, title, type [manual|auto], rule_id,
                  priority, assignee, due_date, status, notes, created_at)
rules            (id, name, trigger_condition, action_template, assignee_default,
                  enabled, tasks_created)
audit_log        (id, permit_id, actor_type [user|agent], actor_id, action,
                  old_value, new_value, timestamp)
users            (id, name, email, role, team_id, created_at)
email_drafts     (id, permit_id, task_id, subject, body, status [draft|approved|sent],
                  reviewed_by, sent_at)
fees             (id, permit_id, type, amount, paid_at, receipt_url)
```

---

## Agent Architecture

The AI agent is the core of the product. Here's how it works:

**Scheduled scans (Tue/Fri 9AM):**
1. Poll permit portals / scrape status pages (Playwright for portals without APIs)
2. Detect status changes → update permit records → write audit log entries
3. Evaluate all active rules against current permit state
4. Fire triggered rules → create tasks → assign per rule config
5. Generate semi-weekly digest → send via SendGrid + Slack
6. Flag escalations requiring human review

**Chat agent (real-time):**
- System prompt: PermitIQ permit intelligence expert
- Tools: `web_search` (Anthropic built-in)
- Searches official .gov sources, municipal portals, ICC/NFPA
- Returns structured answer + CITATIONS section
- Citations parsed and rendered as cards in UI

**Rule evaluation logic:**
```javascript
// Pseudo-code for rule engine
async function evaluateRules(permits) {
  for (const permit of permits) {
    const avgDays = await getJurisdictionAverage(permit.jurisdiction, permit.type);
    
    // Rule 1: Overdue escalation
    if (permit.days_in_queue > avgDays + 20) {
      await createTask({ permit, rule: 'overdue_escalation', priority: 'urgent' });
      await draftEscalationEmail(permit);
    }
    
    // Rule 2: Slow review
    if (permit.days_in_queue > avgDays) {
      await createTask({ permit, rule: 'slow_review', priority: 'high' });
      await postSlackAlert(permit);
    }
    
    // Rule 3: Info requested
    if (permit.status.includes('info requested')) {
      const deadline = await parseDeadlineFromPortal(permit);
      await createTask({ permit, rule: 'info_request', priority: 'urgent', due: deadline });
    }
    
    // Rule 4: Hearing prep (14-day trigger)
    if (permit.hearing_date && daysUntil(permit.hearing_date) <= 14) {
      await createTask({ permit, rule: 'hearing_prep_docs', priority: 'high' });
      await createTask({ permit, rule: 'hearing_prep_notice', priority: 'high' });
    }
    
    // Rule 5: Approval archive
    if (permit.status === 'approved' && !permit.archived) {
      await archivePermit(permit);
      await postSlackAlert(permit, 'approved');
    }
    
    // Rule 6: Expiry warning
    if (permit.expiry_date && daysUntil(permit.expiry_date) <= 30) {
      await createTask({ permit, rule: 'expiry_warning', priority: 'high' });
    }
  }
}
```

---

## Coding Standards

- **Language:** TypeScript everywhere (frontend + backend)
- **Formatting:** Prettier, 2-space indent, single quotes
- **Tests:** Jest for unit tests, Playwright for E2E — write tests for all business logic
- **API design:** REST, JSON, snake_case for DB fields, camelCase for API responses
- **Error handling:** Every async function wrapped in try/catch, errors logged to audit trail
- **Git:** Feature branches only, never commit to main directly. Branch naming: `feature/`, `fix/`, `chore/`
- **Commits:** Conventional commits — `feat:`, `fix:`, `chore:`, `docs:`
- **Components:** Functional React components only, hooks for state
- **Styling:** Tailwind CSS utility classes, no inline styles except for dynamic values
- **Color system:** Use CSS variables matching the dashboard design tokens (see below)
- **Security:** Never log API keys, sanitize all user inputs, parameterize all DB queries

### Design Tokens (match existing dashboard aesthetic)
```css
--bg: #0a0d12;
--surface: #111620;
--surface2: #171d2b;
--border: #1e2a3d;
--accent: #00e5ff;      /* primary cyan */
--accent2: #ff6b35;     /* orange accent */
--success: #00c896;     /* green */
--warn: #ffc300;        /* yellow */
--danger: #ff3d5a;      /* red */
--purple: #a78bfa;      /* auto-task color */
--text: #e8edf5;
--muted: #5a6a85;
--card: #141a26;
```

### Key UI components already built (in the HTML prototype)
- `.panel` — card container with border-radius, dark background
- `.panel-header` — title row with action buttons
- `.badge` + `.badge-warn/success/danger/info/purple` — status pills
- `.btn` + `.btn-primary/ghost/danger/sm` — button variants
- `.task-item` — task row with check, title, meta tags, assignee
- `.stat-card` — KPI card with colored top border
- `.days-chip` — ok/warn/danger colored chips for days-in-queue
- `.toast` — toast notification system (success/warn/danger/info)
- `.chat-panel` — full chat UI with message bubbles, citations, typing indicator

---

## Common Commands

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Lint
npm run lint

# Type check
npm run typecheck

# Build for production
npm run build

# Run database migrations
npm run db:migrate

# Seed database with demo data
npm run db:seed

# Start agent scheduler manually (for testing)
npm run agent:run

# Generate TypeScript types from DB schema
npm run db:generate-types
```

---

## Environment Variables

```bash
# Anthropic
ANTHROPIC_API_KEY=             # Required for AI chat agent and scheduled scans

# Database
DATABASE_URL=                  # PostgreSQL connection string
REDIS_URL=                     # Redis connection string

# File Storage
R2_ACCOUNT_ID=                 # Cloudflare R2
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=permitiq-docs

# Notifications
SENDGRID_API_KEY=              # Email digest and follow-up drafts
SLACK_BOT_TOKEN=               # Slack notifications
SLACK_SIGNING_SECRET=

# Auth
JWT_SECRET=                    # Minimum 32 chars
JWT_EXPIRY=24h

# Integrations
PROCORE_CLIENT_ID=             # Phase 3
PROCORE_CLIENT_SECRET=         # Phase 3

# App
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3000
AGENT_SCHEDULE=0 9 * * 2,5    # Cron: 9AM Tuesday and Friday
```

---

## File Structure (Target)

```
permitiq/
├── CLAUDE.md                   ← You are here
├── .env.local                  ← Local secrets (gitignored)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
│
├── src/
│   ├── app/                    ← Next.js app router
│   │   ├── (dashboard)/        ← Main dashboard layout
│   │   ├── (auth)/             ← Login / signup
│   │   └── api/                ← API routes
│   │       ├── permits/
│   │       ├── tasks/
│   │       ├── rules/
│   │       ├── documents/
│   │       ├── agent/
│   │       └── webhooks/
│   │
│   ├── components/
│   │   ├── dashboard/          ← PermitTracker, StatCards, Sidebar
│   │   ├── tasks/              ← TaskQueue, TaskDetail, CreateTaskForm
│   │   ├── rules/              ← RuleEngine, RuleCard, RuleToggle
│   │   ├── chat/               ← ChatPanel, ChatMessage, CitationCard
│   │   ├── documents/          ← DocumentUpload, DocumentList (Phase 1)
│   │   ├── inspections/        ← InspectionLog, InspectionCalendar (Phase 2)
│   │   └── ui/                 ← Badge, Button, Panel, Toast, Modal
│   │
│   ├── lib/
│   │   ├── agent/
│   │   │   ├── scheduler.ts    ← node-cron Tue/Fri runs
│   │   │   ├── ruleEngine.ts   ← Rule evaluation logic
│   │   │   ├── scraper.ts      ← Playwright portal scraping
│   │   │   └── chat.ts         ← Claude API + web_search
│   │   ├── db/
│   │   │   ├── schema.ts       ← Drizzle ORM schema
│   │   │   └── queries.ts      ← Common DB queries
│   │   ├── email/
│   │   │   └── sendgrid.ts     ← Email sending + template library
│   │   ├── slack/
│   │   │   └── notify.ts       ← Slack notifications
│   │   └── storage/
│   │       └── r2.ts           ← Cloudflare R2 file operations
│   │
│   └── types/
│       └── index.ts            ← Shared TypeScript interfaces
│
├── tests/
│   ├── unit/
│   └── e2e/
│
└── prototype/
    └── permit-agent-dashboard.html   ← Working HTML prototype (reference)
```

---

## Phase 1 — Immediate Build Priorities

When starting Claude Code on this project, begin with these in order:

### Task 1: Project Scaffold
```
Set up Next.js 14 (app router) + TypeScript + Tailwind CSS + Drizzle ORM + PostgreSQL.
Use the design tokens and color system from the CLAUDE.md.
Create the base layout matching the existing dashboard prototype aesthetic:
- Dark background (#0a0d12), grid overlay pattern
- Sticky header with PermitIQ logo, nav tabs, agent status pill
- Page-level tab navigation (Dashboard / Task Manager / Rule Engine)
```

### Task 2: Database Schema
```
Implement the database schema defined in this file using Drizzle ORM.
Start with: projects, permits, tasks, rules, audit_log tables.
Add seed data matching the 5 projects and permits in the prototype.
```

### Task 3: Document Management
```
Build the document upload and management system.
- File upload component (drag & drop + click to browse)
- Document type selector (Application, Approval, Correction, Inspection Report, Other)
- Store files in Cloudflare R2, metadata in PostgreSQL
- Show document list per permit in a slide-out panel
- Version history tracking
This is the highest-priority missing feature — comes up in every demo.
```

### Task 4: Search & Filter
```
Add search and filter to the permit tracker table.
- Search bar: queries permit name, jurisdiction, permit number
- Filter chips: project, permit type, status, overdue only
- Client-side filtering initially (data is in state), server-side later
- Sortable columns with visual sort indicators
```

### Task 5: Permit Expiry System
```
Wire up permit expiry tracking end-to-end.
- Add expiry_date field to permit records
- Countdown display: 30d / 60d / 90d warning tiers with color coding
- Enable Rule #6 in the rule engine
- Add expiry section to the semi-weekly digest template
```

---

## Context From Previous Sessions

This project was designed and built in Claude.ai (claude.ai) before being handed to
Claude Code for local development. The conversation covered:

- Full product design session establishing PermitIQ concept and architecture
- Complete working HTML/CSS/JS prototype built (permit-agent-dashboard.html)
- Combined manual + auto task assignment system (Methods 1 & 2 integrated)
- 17-feature product audit identifying gaps
- 10-slide PPTX build-out roadmap created (PermitIQ_Roadmap.pptx)
- Houston market research identifying 6 target accounts by name
- GTM strategy with 5 milestone gates from Week 8 demo to Week 52 Series A

The prototype is fully functional as a UI demo — it has live Claude API integration
for the chat agent. The next step is converting it from a single HTML file into a
proper full-stack application following the architecture above.

---

## Key Decisions Already Made

- **Storage:** Cloudflare R2 over AWS S3 (no egress fees for document-heavy workload)
- **ORM:** Drizzle over Prisma (lighter, better TypeScript, faster queries)
- **Scheduling:** node-cron over a job queue for MVP (simpler, upgrade to BullMQ in Phase 3)
- **Email:** SendGrid over AWS SES (better deliverability for cold emails to city permit offices)
- **Auth:** JWT initially, move to Auth.js / NextAuth when multi-user ships in Phase 3
- **Model:** `claude-sonnet-4-20250514` for all agent operations (cost/performance balance)
- **Pricing:** $299/mo per project for Growth tier (validated against permit expediter cost of ~$150/hr)

---

## Do Not

- Do not use Prisma — use Drizzle ORM
- Do not use AWS S3 for document storage — use Cloudflare R2
- Do not use purple gradient on white — maintain the dark theme from the prototype
- Do not build mobile-first — desktop-first until Phase 4
- Do not add features outside the Phase 1 scope until Phase 1 is complete
- Do not send emails directly from the agent without user review (email draft review UI first)
- Do not use `any` type in TypeScript — strict mode is on

---

*Last updated: Feb 2026 — generated from Claude.ai design session*
*Next session: Start with Task 1 (project scaffold) and Task 3 (document management)*
