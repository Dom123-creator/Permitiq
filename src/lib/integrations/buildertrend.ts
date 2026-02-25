import { parse } from 'csv-parse/sync';

// Expected CSV columns from Buildertrend export
// Project Name, Project Status, Permit Name, Permit Type,
// Jurisdiction, Permit Number, Status, Submitted Date, Expiry Date, Budget, Notes

const STATUS_MAP: Record<string, string> = {
  'pending': 'pending',
  'under review': 'under-review',
  'under-review': 'under-review',
  'approved': 'approved',
  'info requested': 'info-requested',
  'info-requested': 'info-requested',
  'rejected': 'rejected',
};

const TYPE_MAP: Record<string, string> = {
  'building': 'Building',
  'electrical': 'Electrical',
  'plumbing': 'Plumbing',
  'mechanical': 'Mechanical',
  'fire': 'Fire',
};

export interface BuildertrendRow {
  projectName: string;
  projectStatus: string;
  permitName: string;
  permitType: string;
  jurisdiction: string;
  permitNumber: string;
  status: string;
  submittedDate: string;
  expiryDate: string;
  budget: string;
  notes: string;
}

export function parseBuildertrend(csvContent: string): BuildertrendRow[] {
  const rows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  return rows.map((row) => ({
    projectName: row['Project Name'] ?? row['project_name'] ?? '',
    projectStatus: row['Project Status'] ?? row['project_status'] ?? 'active',
    permitName: row['Permit Name'] ?? row['permit_name'] ?? '',
    permitType: row['Permit Type'] ?? row['permit_type'] ?? 'Building',
    jurisdiction: row['Jurisdiction'] ?? row['jurisdiction'] ?? '',
    permitNumber: row['Permit Number'] ?? row['permit_number'] ?? '',
    status: row['Status'] ?? row['status'] ?? 'pending',
    submittedDate: row['Submitted Date'] ?? row['submitted_date'] ?? '',
    expiryDate: row['Expiry Date'] ?? row['expiry_date'] ?? '',
    budget: row['Budget'] ?? row['budget'] ?? '',
    notes: row['Notes'] ?? row['notes'] ?? '',
  }));
}

export function mapRowToPermit(row: BuildertrendRow) {
  const mappedStatus = STATUS_MAP[row.status.toLowerCase()] ?? 'pending';
  const mappedType = TYPE_MAP[row.permitType.toLowerCase()] ?? 'Building';

  return {
    name: row.permitName,
    type: mappedType,
    jurisdiction: row.jurisdiction || 'Unknown',
    permitNumber: row.permitNumber || null,
    status: mappedStatus,
    submittedAt: row.submittedDate ? new Date(row.submittedDate) : null,
    expiryDate: row.expiryDate ? new Date(row.expiryDate) : null,
    feeBudgeted: row.budget ? row.budget.replace(/[^0-9.]/g, '') || null : null,
    notes: row.notes || null,
  };
}
