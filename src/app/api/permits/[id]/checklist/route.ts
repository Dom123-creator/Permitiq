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

// POST /api/permits/[id]/checklist — add item (or seed defaults)
export async function POST(request: NextRequest, { params }: RouteParams) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  const { id: permitId } = await params;
  try {
    const body = await request.json();
    const db = getDb();

    // Seed defaults: body.seedDefaults = true
    if (body.seedDefaults) {
      const [permit] = await db
        .select({ type: permits.type })
        .from(permits)
        .where(eq(permits.id, permitId))
        .limit(1);
      if (!permit) return NextResponse.json({ error: 'Permit not found' }, { status: 404 });

      const defaults = getDefaultChecklist(permit.type);
      if (defaults.length === 0) return NextResponse.json([]);

      // Delete existing items first to avoid duplicates
      const { count: existing } = await db
        .select({ count: checklistItems.id })
        .from(checklistItems)
        .where(eq(checklistItems.permitId, permitId))
        .then((rows) => ({ count: rows.length }));

      if (existing > 0) {
        // Don't overwrite if items already exist — return current items
        const current = await db
          .select()
          .from(checklistItems)
          .where(eq(checklistItems.permitId, permitId))
          .orderBy(asc(checklistItems.sortOrder));
        return NextResponse.json(current);
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

    // Compute next sortOrder
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

function getDefaultChecklist(permitType: string): DefaultItem[] {
  const type = permitType.toLowerCase();

  const common: DefaultItem[] = [
    { label: 'Application fee paid', category: 'fees', required: true },
    { label: 'Submit application to AHJ', category: 'steps', required: true },
    { label: 'Confirm receipt / application number obtained', category: 'steps', required: true },
  ];

  const byType: Record<string, DefaultItem[]> = {
    building: [
      { label: 'Completed permit application form', category: 'documents', required: true },
      { label: 'Site plan / plot plan', category: 'documents', required: true },
      { label: 'Construction drawings (3 sets)', category: 'documents', required: true },
      { label: 'Structural engineering calculations', category: 'documents', required: true },
      { label: 'Energy compliance documentation (IECC)', category: 'documents', required: true },
      { label: 'Owner authorization / notarized letter', category: 'documents', required: true },
      { label: 'Soils report (if required by jurisdiction)', category: 'documents', required: false },
      { label: 'ADA compliance documentation', category: 'documents', required: false },
    ],
    electrical: [
      { label: 'Completed permit application form', category: 'documents', required: true },
      { label: 'Electrical site plan and one-line diagram', category: 'documents', required: true },
      { label: 'Load calculations', category: 'documents', required: true },
      { label: 'Equipment specifications / cut sheets', category: 'documents', required: true },
      { label: 'Arc flash study (if required)', category: 'documents', required: false },
      { label: 'Utility coordination letter', category: 'documents', required: false },
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
      { label: 'Energy calculations (Manual J/D/S)', category: 'documents', required: true },
      { label: 'Duct layout drawings', category: 'documents', required: true },
      { label: 'Ventilation calculations', category: 'documents', required: false },
    ],
    fire: [
      { label: 'Completed permit application form', category: 'documents', required: true },
      { label: 'Fire suppression system drawings', category: 'documents', required: true },
      { label: 'Fire alarm system drawings', category: 'documents', required: true },
      { label: 'Life safety plan', category: 'documents', required: true },
      { label: 'Hydraulic calculations', category: 'documents', required: true },
      { label: 'Coordination with fire marshal completed', category: 'steps', required: true },
      { label: 'UL listing documentation', category: 'documents', required: false },
    ],
  };

  const typeItems = byType[type] ?? [
    { label: 'Completed permit application form', category: 'documents', required: true },
    { label: 'Supporting drawings / plans', category: 'documents', required: true },
  ];

  return [...typeItems, ...common];
}
