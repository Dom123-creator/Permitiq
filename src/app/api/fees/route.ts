import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { getDb, fees, permits } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guards';

// GET /api/fees?permitId=<uuid>
export async function GET(request: NextRequest) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  try {
    const { searchParams } = new URL(request.url);
    const permitId = searchParams.get('permitId');

    const db = getDb();

    const query = db
      .select()
      .from(fees)
      .orderBy(desc(fees.createdAt));

    const rows = permitId
      ? await query.where(eq(fees.permitId, permitId))
      : await query;

    return NextResponse.json(rows);
  } catch (error) {
    console.error('GET /api/fees failed:', error);
    const msg = error instanceof Error ? error.message : 'Unknown';
    if (msg.includes('DATABASE_URL')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to fetch fees' }, { status: 500 });
  }
}

// POST /api/fees — create a new fee entry
export async function POST(request: NextRequest) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  try {
    const body = await request.json();
    const { permitId, type, amount, paidAt, receiptUrl } = body;

    if (!permitId || !type || amount == null) {
      return NextResponse.json(
        { error: 'permitId, type, and amount are required' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Verify permit exists
    const [permit] = await db.select({ id: permits.id }).from(permits).where(eq(permits.id, permitId)).limit(1);
    if (!permit) {
      return NextResponse.json({ error: 'Permit not found' }, { status: 404 });
    }

    const [fee] = await db
      .insert(fees)
      .values({
        permitId,
        type,
        amount: String(amount),
        paidAt: paidAt ? new Date(paidAt) : null,
        receiptUrl: receiptUrl ?? null,
      })
      .returning();

    return NextResponse.json(fee, { status: 201 });
  } catch (error) {
    console.error('POST /api/fees failed:', error);
    const msg = error instanceof Error ? error.message : 'Unknown';
    if (msg.includes('DATABASE_URL')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to create fee' }, { status: 500 });
  }
}
