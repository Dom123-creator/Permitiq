export type EmailTemplateType = 'escalation' | 'status-check' | 'info-response' | 'hearing-followup' | 'expiry-warning' | 'custom';

export type EmailStatus = 'draft' | 'pending-review' | 'approved' | 'sent' | 'rejected';

export interface EmailDraft {
  id: string;
  permitId: string | null;
  taskId?: string | null;
  templateType: EmailTemplateType | string;
  subject: string;
  body: string;
  recipient: string | null;
  recipientName?: string | null;
  cc?: string[];
  status: EmailStatus | string;
  createdBy: 'agent' | 'user' | string;
  createdAt: Date | string;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  sentAt?: Date | string | null;
  // Joined display fields
  permitName?: string | null;
  projectName?: string | null;
}

export interface EmailTemplate {
  id: string;
  type: EmailTemplateType;
  name: string;
  description: string;
  subject: string;
  body: string;
  variables: string[];
}

export const emailTemplates: EmailTemplate[] = [
  {
    id: '1',
    type: 'escalation',
    name: 'Escalation Notice',
    description: 'Escalate a permit that has exceeded normal processing time',
    subject: 'Urgent: Permit Review Escalation - {{permitNumber}}',
    body: `Dear {{recipientName}},

I am writing to request an expedited review of permit application {{permitNumber}} for the {{projectName}} project.

This permit has been under review for {{daysInQueue}} days, which exceeds the typical processing time of {{avgDays}} days for {{permitType}} permits in {{jurisdiction}}.

The delay is impacting our construction schedule and causing significant carrying costs. We kindly request that this application be prioritized for review.

Please let us know if any additional documentation is required to expedite this process.

Thank you for your attention to this matter.

Best regards,
{{senderName}}
{{companyName}}
{{contactPhone}}`,
    variables: ['permitNumber', 'projectName', 'daysInQueue', 'avgDays', 'permitType', 'jurisdiction', 'recipientName', 'senderName', 'companyName', 'contactPhone'],
  },
  {
    id: '2',
    type: 'status-check',
    name: 'Status Check',
    description: 'Request current status of a permit application',
    subject: 'Status Inquiry - Permit {{permitNumber}}',
    body: `Dear {{recipientName}},

I am writing to inquire about the current status of permit application {{permitNumber}} for the {{projectName}} project, submitted on {{submitDate}}.

Could you please provide an update on:
1. Current review status
2. Estimated completion date
3. Any pending requirements or corrections needed

Thank you for your assistance.

Best regards,
{{senderName}}
{{companyName}}`,
    variables: ['permitNumber', 'projectName', 'submitDate', 'recipientName', 'senderName', 'companyName'],
  },
  {
    id: '3',
    type: 'info-response',
    name: 'Information Response',
    description: 'Respond to a request for additional information',
    subject: 'Re: Additional Information Request - {{permitNumber}}',
    body: `Dear {{recipientName}},

Thank you for your review of permit application {{permitNumber}}.

In response to your request for additional information dated {{requestDate}}, please find the following:

{{responseDetails}}

The requested documents have been attached to this email / uploaded to the portal.

Please let us know if you need any additional clarification.

Best regards,
{{senderName}}
{{companyName}}`,
    variables: ['permitNumber', 'requestDate', 'responseDetails', 'recipientName', 'senderName', 'companyName'],
  },
  {
    id: '4',
    type: 'hearing-followup',
    name: 'Hearing Follow-up',
    description: 'Follow up after a permit hearing',
    subject: 'Follow-up: {{permitNumber}} Hearing on {{hearingDate}}',
    body: `Dear {{recipientName}},

Thank you for the opportunity to present at the hearing on {{hearingDate}} regarding permit application {{permitNumber}} for the {{projectName}} project.

As discussed during the hearing, we will provide the following:
{{actionItems}}

We appreciate your consideration and look forward to a favorable outcome.

Best regards,
{{senderName}}
{{companyName}}`,
    variables: ['permitNumber', 'hearingDate', 'projectName', 'actionItems', 'recipientName', 'senderName', 'companyName'],
  },
  {
    id: '5',
    type: 'expiry-warning',
    name: 'Expiry Warning',
    description: 'Alert about upcoming permit expiration',
    subject: 'Action Required: Permit {{permitNumber}} Expiring {{expiryDate}}',
    body: `Dear Team,

This is a reminder that permit {{permitNumber}} for the {{projectName}} project is set to expire on {{expiryDate}} ({{daysUntilExpiry}} days from now).

Permit Details:
- Type: {{permitType}}
- Jurisdiction: {{jurisdiction}}
- Project: {{projectName}}

Please take the necessary action to either:
1. Complete the permitted work before expiration
2. Apply for a permit extension if needed

Failure to act may result in additional fees or the need to reapply.

Best regards,
PermitIQ Agent`,
    variables: ['permitNumber', 'projectName', 'expiryDate', 'daysUntilExpiry', 'permitType', 'jurisdiction'],
  },
];

export const statusConfig: Record<EmailStatus, { label: string; class: string }> = {
  'draft': { label: 'Draft', class: 'bg-muted/20 text-muted' },
  'pending-review': { label: 'Pending Review', class: 'badge-warn' },
  'approved': { label: 'Approved', class: 'badge-info' },
  'sent': { label: 'Sent', class: 'badge-success' },
  'rejected': { label: 'Rejected', class: 'badge-danger' },
};

export const templateTypeLabels: Record<EmailTemplateType, string> = {
  'escalation': 'Escalation',
  'status-check': 'Status Check',
  'info-response': 'Info Response',
  'hearing-followup': 'Hearing Follow-up',
  'expiry-warning': 'Expiry Warning',
  'custom': 'Custom',
};
