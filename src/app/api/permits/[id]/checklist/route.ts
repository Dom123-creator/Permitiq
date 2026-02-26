import { NextRequest, NextResponse } from 'next/server';
import { eq, asc } from 'drizzle-orm';
import { getDb, checklistItems, permits } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guards';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/permits/[id]/checklist
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  const { id } = await params;
  try {
    const db = getDb();
    const items = await db
      .select()
      .from(checklistItems)
      .where(eq(checklistItems.permitId, id))
      .orderBy(asc(checklistItems.sortOrder), asc(checklistItems.createdAt));
    return NextResponse.json(items);
  } catch (error) {
    console.error('GET /api/permits/[id]/checklist failed:', error);
    return NextResponse.json({ error: 'Failed to fetch checklist' }, { status: 500 });
  }
}

// POST /api/permits/[id]/checklist — add item, seed defaults, or reset to defaults
export async function POST(request: NextRequest, { params }: RouteParams) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  const { id: permitId } = await params;
  try {
    const body = await request.json();
    const db = getDb();

    // Seed or reset defaults: body.seedDefaults = true | body.resetDefaults = true
    if (body.seedDefaults || body.resetDefaults) {
      const [permit] = await db
        .select({ type: permits.type, jurisdiction: permits.jurisdiction })
        .from(permits)
        .where(eq(permits.id, permitId))
        .limit(1);
      if (!permit) return NextResponse.json({ error: 'Permit not found' }, { status: 404 });

      const jurisdiction = body.jurisdiction ?? permit.jurisdiction ?? '';
      const defaults = getDefaultChecklist(permit.type, jurisdiction);
      if (defaults.length === 0) return NextResponse.json([]);

      const existingRows = await db
        .select({ id: checklistItems.id })
        .from(checklistItems)
        .where(eq(checklistItems.permitId, permitId));

      if (existingRows.length > 0 && !body.resetDefaults) {
        // seedDefaults with existing items — return current without overwriting
        const current = await db
          .select()
          .from(checklistItems)
          .where(eq(checklistItems.permitId, permitId))
          .orderBy(asc(checklistItems.sortOrder));
        return NextResponse.json(current);
      }

      // resetDefaults or first seed — delete all then insert fresh
      if (existingRows.length > 0) {
        await db.delete(checklistItems).where(eq(checklistItems.permitId, permitId));
      }

      const inserted = await db
        .insert(checklistItems)
        .values(defaults.map((d, i) => ({ ...d, permitId, sortOrder: i })))
        .returning();
      return NextResponse.json(inserted);
    }

    // Single item add
    const { label, category = 'documents', required = true } = body;
    if (!label) return NextResponse.json({ error: 'label is required' }, { status: 400 });

    const existing = await db
      .select({ sortOrder: checklistItems.sortOrder })
      .from(checklistItems)
      .where(eq(checklistItems.permitId, permitId))
      .orderBy(asc(checklistItems.sortOrder));
    const nextOrder = existing.length > 0
      ? (existing[existing.length - 1].sortOrder ?? 0) + 1
      : 0;

    const [item] = await db
      .insert(checklistItems)
      .values({ permitId, label, category, required, sortOrder: nextOrder })
      .returning();
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('POST /api/permits/[id]/checklist failed:', error);
    return NextResponse.json({ error: 'Failed to add checklist item' }, { status: 500 });
  }
}

type DefaultItem = { label: string; category: string; required: boolean };

/**
 * Build a checklist by merging:
 * 1. Base items for the permit type
 * 2. Jurisdiction-specific additions/overrides
 * 3. Common items (fee, submit, confirm receipt)
 */
function getDefaultChecklist(permitType: string, jurisdiction: string): DefaultItem[] {
  const type = permitType.toLowerCase();
  const jur = jurisdiction.toLowerCase();

  const common: DefaultItem[] = [
    { label: 'Application fee paid', category: 'fees', required: true },
    { label: 'Submit application to AHJ portal or in person', category: 'steps', required: true },
    { label: 'Confirm receipt / obtain application tracking number', category: 'steps', required: true },
  ];

  // Base items by permit type
  const byType: Record<string, DefaultItem[]> = {
    building: [
      { label: 'Completed permit application form', category: 'documents', required: true },
      { label: 'Site plan / plot plan (to scale)', category: 'documents', required: true },
      { label: 'Construction drawings (architectural + structural)', category: 'documents', required: true },
      { label: 'Structural engineering calculations (PE-stamped)', category: 'documents', required: true },
      { label: 'Energy compliance documentation (IECC)', category: 'documents', required: true },
      { label: 'Owner authorization / notarized letter', category: 'documents', required: true },
      { label: 'Soils / geotechnical report', category: 'documents', required: false },
      { label: 'ADA / TAS compliance documentation', category: 'documents', required: false },
    ],
    electrical: [
      { label: 'Completed permit application form', category: 'documents', required: true },
      { label: 'Electrical site plan and one-line diagram', category: 'documents', required: true },
      { label: 'Load calculations', category: 'documents', required: true },
      { label: 'Equipment specifications / cut sheets', category: 'documents', required: true },
      { label: 'Arc flash study', category: 'documents', required: false },
      { label: 'Utility coordination letter / service approval', category: 'documents', required: false },
    ],
    plumbing: [
      { label: 'Completed permit application form', category: 'documents', required: true },
      { label: 'Plumbing floor plan drawings', category: 'documents', required: true },
      { label: 'Fixture unit schedule', category: 'documents', required: true },
      { label: 'Isometric riser diagrams', category: 'documents', required: true },
      { label: 'Backflow prevention plan', category: 'documents', required: false },
    ],
    mechanical: [
      { label: 'Completed permit application form', category: 'documents', required: true },
      { label: 'HVAC design documents', category: 'documents', required: true },
      { label: 'Equipment specifications and cut sheets', category: 'documents', required: true },
      { label: 'Energy calculations (Manual J/D/S or ASHRAE)', category: 'documents', required: true },
      { label: 'Duct layout drawings', category: 'documents', required: true },
      { label: 'Ventilation calculations', category: 'documents', required: false },
    ],
    fire: [
      { label: 'Completed permit application form', category: 'documents', required: true },
      { label: 'Fire suppression system drawings (PE-stamped)', category: 'documents', required: true },
      { label: 'Fire alarm system drawings', category: 'documents', required: true },
      { label: 'Life safety plan', category: 'documents', required: true },
      { label: 'Hydraulic calculations', category: 'documents', required: true },
      { label: 'Coordination with fire marshal completed', category: 'steps', required: true },
      { label: 'UL listing documentation', category: 'documents', required: false },
    ],
  };

  // Jurisdiction-specific additions
  const jurisdictionItems: DefaultItem[] = getJurisdictionItems(type, jur);

  const typeItems = byType[type] ?? [
    { label: 'Completed permit application form', category: 'documents', required: true },
    { label: 'Supporting drawings / plans', category: 'documents', required: true },
  ];

  return [...typeItems, ...jurisdictionItems, ...common];
}

function getJurisdictionItems(type: string, jur: string): DefaultItem[] {
  // City of Houston / Houston
  if (jur.includes('houston') && !jur.includes('harris')) {
    if (type === 'building') return [
      { label: 'COH Development Services Portal submission (eDPS)', category: 'steps', required: true },
      { label: 'TAS (Texas Accessibility Standards) review filing', category: 'documents', required: true },
      { label: 'Floodplain elevation certificate (if in floodplain)', category: 'documents', required: false },
      { label: 'FOG (fats/oils/grease) control plan if food service', category: 'documents', required: false },
      { label: 'Fire code compliance review (Houston Fire Dept)', category: 'steps', required: true },
    ];
    if (type === 'electrical') return [
      { label: 'COH eDPS portal submission', category: 'steps', required: true },
      { label: 'CenterPoint Energy service entrance approval', category: 'documents', required: true },
      { label: 'Houston Fire Dept coordination (if fire alarm)', category: 'steps', required: false },
    ];
    if (type === 'plumbing') return [
      { label: 'COH eDPS portal submission', category: 'steps', required: true },
      { label: 'Backflow prevention device registered with COH', category: 'steps', required: true },
    ];
    if (type === 'mechanical') return [
      { label: 'COH eDPS portal submission', category: 'steps', required: true },
      { label: 'BAAQMD / TCEQ air quality approval (if applicable)', category: 'documents', required: false },
    ];
    if (type === 'fire') return [
      { label: 'Houston Fire Department plan review appointment', category: 'steps', required: true },
      { label: 'High-rise fire safety plan (buildings > 75ft)', category: 'documents', required: false },
      { label: 'Knox box installation required for HFD access', category: 'steps', required: true },
    ];
  }

  // Harris County (unincorporated areas — HCPID)
  if (jur.includes('harris')) {
    if (type === 'building') return [
      { label: 'HCPID online permit portal submission', category: 'steps', required: true },
      { label: 'Harris County Flood Control review (HCFCD) if near floodway', category: 'documents', required: false },
      { label: 'TAS accessibility review', category: 'documents', required: true },
      { label: 'Septic / OSSF approval (if no public sewer)', category: 'documents', required: false },
    ];
    if (type === 'electrical') return [
      { label: 'HCPID online permit portal submission', category: 'steps', required: true },
      { label: 'Centerpoint or local utility coordination', category: 'documents', required: true },
    ];
    return [
      { label: 'HCPID online permit portal submission', category: 'steps', required: true },
    ];
  }

  // City of Austin / Austin
  if (jur.includes('austin')) {
    if (type === 'building') return [
      { label: 'Austin Development Services Department (DSD) submission via Austin Build + Connect', category: 'steps', required: true },
      { label: 'Austin Energy Green Building review (if applicable)', category: 'documents', required: false },
      { label: 'Impervious cover calculation', category: 'documents', required: true },
      { label: 'Stormwater / drainage review', category: 'documents', required: true },
      { label: 'Tree survey and Heritage Tree report', category: 'documents', required: false },
      { label: 'Austin Water Utility review', category: 'steps', required: true },
    ];
    if (type === 'electrical') return [
      { label: 'Austin Build + Connect portal submission', category: 'steps', required: true },
      { label: 'Austin Energy service entrance review', category: 'documents', required: true },
    ];
    if (type === 'fire') return [
      { label: 'Austin Fire Department plan review', category: 'steps', required: true },
      { label: 'Austin Build + Connect portal submission', category: 'steps', required: true },
    ];
    return [
      { label: 'Austin Build + Connect portal submission', category: 'steps', required: true },
    ];
  }

  // New York City
  if (jur.includes('new york') || jur.includes('nyc') || jur.includes('manhattan') || jur.includes('brooklyn')) {
    if (type === 'building') return [
      { label: 'NYC DOB NOW: Build — job application filed', category: 'steps', required: true },
      { label: 'Professional Engineer (PE) or Registered Architect (RA) of record designated', category: 'steps', required: true },
      { label: 'Special inspection program submitted', category: 'documents', required: true },
      { label: 'Statement of special inspections', category: 'documents', required: true },
      { label: 'NYC Energy Conservation Code compliance (TR8)', category: 'documents', required: true },
      { label: 'Landmark Preservation Commission (LPC) approval if historic district', category: 'documents', required: false },
      { label: 'DEP sewer connection approval', category: 'documents', required: true },
    ];
    return [
      { label: 'NYC DOB NOW portal job filing', category: 'steps', required: true },
      { label: 'PE / RA of record designated', category: 'steps', required: true },
    ];
  }

  // Dallas / Fort Worth
  if (jur.includes('dallas') || jur.includes('fort worth') || jur.includes('dfw')) {
    return [
      { label: 'City online permit portal submission', category: 'steps', required: true },
      { label: 'TAS (Texas Accessibility Standards) compliance', category: 'documents', required: true },
      { label: 'DART / TxDOT coordination if near right-of-way', category: 'documents', required: false },
    ];
  }

  // Generic — no jurisdiction-specific items needed
  return [];
}
