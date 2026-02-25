export type AuditAction =
  | 'permit_created'
  | 'permit_updated'
  | 'permit_archived'
  | 'permit_unarchived'
  | 'status_changed'
  | 'inspection_result_set'
  | 'inspection_scheduled'
  | 'inspection_completed'
  | 'document_uploaded'
  | 'document_deleted'
  | 'task_created'
  | 'task_completed'
  | 'rule_triggered'
  | 'email_sent'
  | 'email_approved'
  | 'email_rejected'
  | 'note_added'
  | 'assignee_changed'
  | 'expiry_updated'
  | 'archived'
  | 'unarchived';

export type ActorType = 'user' | 'agent' | 'system';

export interface AuditLogEntry {
  id: string;
  permitId: string | null;
  permitName?: string | null;
  projectName?: string | null;
  action: string; // string not AuditAction — DB can hold any value
  actorType: string;
  actorId: string | null;
  actorName: string;
  description: string;
  oldValue?: string | null;
  newValue?: string | null;
  timestamp: Date | string;
}

export const actionLabels: Record<AuditAction, string> = {
  permit_created: 'Permit Created',
  permit_updated: 'Permit Updated',
  permit_archived: 'Permit Archived',
  permit_unarchived: 'Permit Unarchived',
  status_changed: 'Status Changed',
  inspection_result_set: 'Inspection Result',
  inspection_scheduled: 'Inspection Scheduled',
  inspection_completed: 'Inspection Completed',
  document_uploaded: 'Document Uploaded',
  document_deleted: 'Document Deleted',
  task_created: 'Task Created',
  task_completed: 'Task Completed',
  rule_triggered: 'Rule Triggered',
  email_sent: 'Email Sent',
  email_approved: 'Email Approved',
  email_rejected: 'Email Rejected',
  note_added: 'Note Added',
  assignee_changed: 'Assignee Changed',
  expiry_updated: 'Expiry Updated',
  archived: 'Archived',
  unarchived: 'Unarchived',
};

export const actionIcons: Record<AuditAction, string> = {
  permit_created: '📄',
  permit_updated: '✏️',
  permit_archived: '📦',
  permit_unarchived: '📤',
  status_changed: '🔄',
  inspection_result_set: '✅',
  inspection_scheduled: '📅',
  inspection_completed: '☑️',
  document_uploaded: '📎',
  document_deleted: '🗑️',
  task_created: '📋',
  task_completed: '☑️',
  rule_triggered: '⚡',
  email_sent: '📧',
  email_approved: '✓',
  email_rejected: '✗',
  note_added: '💬',
  assignee_changed: '👤',
  expiry_updated: '⏰',
  archived: '📦',
  unarchived: '📤',
};

export const actorTypeConfig: Record<string, { label: string; class: string }> = {
  user: { label: 'User', class: 'bg-accent/20 text-accent' },
  agent: { label: 'Agent', class: 'bg-purple/20 text-purple' },
  system: { label: 'System', class: 'bg-muted/20 text-muted' },
};

export function getActionLabel(action: string): string {
  return (
    actionLabels[action as AuditAction] ??
    action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function getActionIcon(action: string): string {
  return actionIcons[action as AuditAction] ?? '•';
}

export function formatAuditTimestamp(date: Date | string): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diff / 60000);
  const diffHours = Math.floor(diff / 3600000);
  const diffDays = Math.floor(diff / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date));
}
