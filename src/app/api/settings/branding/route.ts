import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb, workspaceSettings } from '@/lib/db';
import { requireRole } from '@/lib/auth/guards';

const FIXED_ID = '00000000-0000-0000-0000-000000000001';

function sanitizeHex(color: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#00e5ff';
}

// GET /api/settings/branding — public, no auth required (needed for login page)
export async function GET() {
  try {
    const db = getDb();
    const rows = await db.select().from(workspaceSettings).limit(1);

    if (rows.length === 0) {
      return NextResponse.json({
        companyName: 'PermitIQ',
        primaryColor: '#00e5ff',
        logoUrl: null,
        faviconUrl: null,
      });
    }

    const row = rows[0];
    return NextResponse.json({
      companyName: row.companyName,
      primaryColor: sanitizeHex(row.primaryColor ?? '#00e5ff'),
      logoUrl: row.logoUrl ?? null,
      faviconUrl: row.faviconUrl ?? null,
    });
  } catch {
    // If DB not configured yet, return defaults
    return NextResponse.json({
      companyName: 'PermitIQ',
      primaryColor: '#00e5ff',
      logoUrl: null,
      faviconUrl: null,
    });
  }
}

const patchSchema = z.object({
  companyName: z.string().min(1).max(100).optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color').optional(),
});

// PATCH /api/settings/branding — owner only
export async function PATCH(request: NextRequest) {
  const sessionOrError = await requireRole(['owner']);
  if (sessionOrError instanceof NextResponse) return sessionOrError;
  const session = sessionOrError;

  try {
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
    }

    const db = getDb();
    const updates: Record<string, unknown> = { updatedAt: new Date(), updatedBy: session.user.id };
    if (parsed.data.companyName !== undefined) updates.companyName = parsed.data.companyName;
    if (parsed.data.primaryColor !== undefined) updates.primaryColor = sanitizeHex(parsed.data.primaryColor);

    // Upsert by fixed ID
    const [row] = await db
      .insert(workspaceSettings)
      .values({
        id: FIXED_ID,
        companyName: parsed.data.companyName ?? 'PermitIQ',
        primaryColor: sanitizeHex(parsed.data.primaryColor ?? '#00e5ff'),
        updatedBy: session.user.id,
      })
      .onConflictDoUpdate({
        target: workspaceSettings.id,
        set: updates,
      })
      .returning();

    return NextResponse.json({
      companyName: row.companyName,
      primaryColor: sanitizeHex(row.primaryColor ?? '#00e5ff'),
      logoUrl: row.logoUrl ?? null,
    });
  } catch (error) {
    console.error('PATCH /api/settings/branding failed:', error);
    return NextResponse.json({ error: 'Failed to update branding' }, { status: 500 });
  }
}
