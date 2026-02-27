import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, jurisdictions } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guards';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/markets/[id]
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  const { id } = await params;
  try {
    const db = getDb();
    const [row] = await db.select().from(jurisdictions).where(eq(jurisdictions.id, id)).limit(1);
    if (!row) return NextResponse.json({ error: 'Jurisdiction not found' }, { status: 404 });

    return NextResponse.json({
      ...row,
      primarySectors: row.primarySectors ? JSON.parse(row.primarySectors) as string[] : [],
    });
  } catch (error) {
    console.error('GET /api/markets/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to fetch jurisdiction' }, { status: 500 });
  }
}
