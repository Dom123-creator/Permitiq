import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, workspaceSettings } from '@/lib/db';
import { requireRole } from '@/lib/auth/guards';

const FIXED_ID = '00000000-0000-0000-0000-000000000001';

// POST /api/settings/branding/logo — owner only — upload logo to R2
export async function POST(request: NextRequest) {
  const sessionOrError = await requireRole(['owner']);
  if (sessionOrError instanceof NextResponse) return sessionOrError;
  const session = sessionOrError;

  try {
    const { uploadFile } = await import('@/lib/storage/r2');
    const formData = await request.formData();
    const file = formData.get('logo') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No logo file provided' }, { status: 400 });
    }

    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Logo must be PNG, JPEG, SVG, or WebP' }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Logo must be under 2MB' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { key } = await uploadFile(buffer, `logo-${session.user.id}`, file.type, 'branding');

    const db = getDb();
    await db
      .insert(workspaceSettings)
      .values({ id: FIXED_ID, companyName: 'PermitIQ', logoUrl: key, updatedBy: session.user.id })
      .onConflictDoUpdate({
        target: workspaceSettings.id,
        set: { logoUrl: key, updatedAt: new Date(), updatedBy: session.user.id },
      });

    return NextResponse.json({ logoUrl: key });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown';
    if (msg.includes('R2 credentials')) {
      return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
    }
    console.error('POST /api/settings/branding/logo failed:', error);
    return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 });
  }
}
