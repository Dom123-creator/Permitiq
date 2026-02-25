export type InspectionType =
  | 'foundation'
  | 'framing'
  | 'electrical-rough'
  | 'plumbing-rough'
  | 'mechanical-rough'
  | 'insulation'
  | 'drywall'
  | 'electrical-final'
  | 'plumbing-final'
  | 'mechanical-final'
  | 'fire-alarm'
  | 'final';

export type InspectionResult = 'pass' | 'fail' | 'partial' | 'scheduled' | 'cancelled';

export interface Inspection {
  id: string;
  permitId: string;
  type: InspectionType;
  scheduledDate: Date | null;
  completedDate: Date | null;
  result: InspectionResult;
  inspectorName: string | null;
  inspectorContact: string | null;
  notes: string | null;
  sequenceOrder: number;
  createdAt: Date;
}

export interface InspectionSequence {
  type: InspectionType;
  label: string;
  description: string;
  required: boolean;
}

// Standard inspection sequences by permit type
export const inspectionSequences: Record<string, InspectionSequence[]> = {
  Building: [
    { type: 'foundation', label: 'Foundation', description: 'Footings and foundation inspection', required: true },
    { type: 'framing', label: 'Framing', description: 'Structural framing inspection', required: true },
    { type: 'insulation', label: 'Insulation', description: 'Insulation and vapor barrier', required: true },
    { type: 'drywall', label: 'Drywall', description: 'Drywall installation inspection', required: true },
    { type: 'final', label: 'Final', description: 'Final building inspection', required: true },
  ],
  Electrical: [
    { type: 'electrical-rough', label: 'Rough-In', description: 'Electrical rough-in inspection', required: true },
    { type: 'electrical-final', label: 'Final', description: 'Final electrical inspection', required: true },
  ],
  Plumbing: [
    { type: 'plumbing-rough', label: 'Rough-In', description: 'Plumbing rough-in inspection', required: true },
    { type: 'plumbing-final', label: 'Final', description: 'Final plumbing inspection', required: true },
  ],
  Mechanical: [
    { type: 'mechanical-rough', label: 'Rough-In', description: 'HVAC rough-in inspection', required: true },
    { type: 'mechanical-final', label: 'Final', description: 'Final mechanical inspection', required: true },
  ],
  Fire: [
    { type: 'fire-alarm', label: 'Fire Alarm', description: 'Fire alarm system inspection', required: true },
    { type: 'final', label: 'Final', description: 'Final fire safety inspection', required: true },
  ],
};

export const inspectionTypeLabels: Record<InspectionType, string> = {
  'foundation': 'Foundation',
  'framing': 'Framing',
  'electrical-rough': 'Electrical Rough-In',
  'plumbing-rough': 'Plumbing Rough-In',
  'mechanical-rough': 'Mechanical Rough-In',
  'insulation': 'Insulation',
  'drywall': 'Drywall',
  'electrical-final': 'Electrical Final',
  'plumbing-final': 'Plumbing Final',
  'mechanical-final': 'Mechanical Final',
  'fire-alarm': 'Fire Alarm',
  'final': 'Final',
};

export const resultConfig: Record<InspectionResult, { label: string; class: string; icon: string }> = {
  pass: { label: 'Passed', class: 'badge-success', icon: '✓' },
  fail: { label: 'Failed', class: 'badge-danger', icon: '✗' },
  partial: { label: 'Partial', class: 'badge-warn', icon: '◐' },
  scheduled: { label: 'Scheduled', class: 'badge-info', icon: '◷' },
  cancelled: { label: 'Cancelled', class: 'bg-muted/20 text-muted', icon: '—' },
};
