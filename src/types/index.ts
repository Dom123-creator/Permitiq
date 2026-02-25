// Project types
export interface Project {
  id: string;
  name: string;
  client: string | null;
  status: 'active' | 'on-hold' | 'completed';
  dailyCarryingCost: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// Permit types
export type PermitType = 'Building' | 'Electrical' | 'Plumbing' | 'Mechanical' | 'Fire' | 'Other';
export type PermitStatus = 'pending' | 'under-review' | 'info-requested' | 'approved' | 'rejected';

export interface Permit {
  id: string;
  projectId: string;
  name: string;
  type: PermitType;
  jurisdiction: string;
  authority: string | null;
  permitNumber: string | null;
  submittedAt: Date | null;
  status: PermitStatus;
  daysInQueue: number;
  expiryDate: Date | null;
  feeBudgeted: number | null;
  feeActual: number | null;
  notes: string | null;
  archived: boolean;
  hearingDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Document types
export type DocumentType = 'Application' | 'Approval' | 'Correction' | 'Inspection Report' | 'Other';

export interface Document {
  id: string;
  permitId: string;
  type: DocumentType;
  filename: string;
  storageUrl: string;
  version: number;
  uploadedBy: string | null;
  uploadedAt: Date;
}

// Inspection types
export type InspectionType = 'framing' | 'rough-in' | 'insulation' | 'final' | 'electrical' | 'plumbing' | 'mechanical' | 'fire';
export type InspectionResult = 'pass' | 'fail' | 'partial';

export interface Inspection {
  id: string;
  permitId: string;
  type: InspectionType;
  scheduledDate: Date | null;
  result: InspectionResult | null;
  inspectorName: string | null;
  inspectorContact: string | null;
  notes: string | null;
  createdAt: Date;
}

// Task types
export type TaskType = 'manual' | 'auto';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in-progress' | 'completed';

export interface Task {
  id: string;
  permitId: string | null;
  projectId: string | null;
  title: string;
  type: TaskType;
  ruleId: string | null;
  priority: TaskPriority;
  assignee: string | null;
  dueDate: Date | null;
  status: TaskStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Rule types
export interface Rule {
  id: string;
  name: string;
  description: string | null;
  triggerCondition: string;
  actionTemplate: string;
  assigneeDefault: string | null;
  enabled: boolean;
  tasksCreated: number;
  createdAt: Date;
  updatedAt: Date;
}

// Audit log types
export type ActorType = 'user' | 'agent';

export interface AuditLogEntry {
  id: string;
  permitId: string | null;
  actorType: ActorType;
  actorId: string | null;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  timestamp: Date;
}

// User types
export type UserRole = 'owner' | 'admin' | 'pm' | 'superintendent' | 'teammate';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  teamId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Email draft types
export type EmailDraftStatus = 'draft' | 'approved' | 'sent';

export interface EmailDraft {
  id: string;
  permitId: string | null;
  taskId: string | null;
  subject: string;
  body: string;
  recipient: string | null;
  status: EmailDraftStatus;
  reviewedBy: string | null;
  sentAt: Date | null;
  createdAt: Date;
}

// Fee types
export type FeeType = 'base' | 're-inspection' | 'expedite' | 'plan-check';

export interface Fee {
  id: string;
  permitId: string;
  type: FeeType;
  amount: number;
  paidAt: Date | null;
  receiptUrl: string | null;
  createdAt: Date;
}

// Integration types
export interface Integration {
  id: string;
  userId: string;
  provider: 'procore' | 'buildertrend' | 'zapier';
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: Date | null;
  providerData: string | null; // JSON string
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcoreCompany {
  id: number;
  name: string;
}

export interface ProcoreProject {
  id: number;
  name: string;
  status: string;
}

export interface SyncResult {
  projectsCreated: number;
  projectsUpdated: number;
  permitsCreated: number;
  permitsUpdated: number;
  errors: string[];
}

export interface BuildertrendImportResult {
  projectsCreated: number;
  permitsCreated: number;
  skipped: number;
  errors: string[];
}

// Chat types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timestamp: Date;
}

export interface Citation {
  url: string;
  title?: string;
  domain?: string;
}
