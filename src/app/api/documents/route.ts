import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { getDb, documents } from '@/lib/db';

// GET /api/documents?permitId=<id> - List documents for a permit
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const permitId = searchParams.get('permitId');

  if (!permitId) {
    return NextResponse.json({ error: 'permitId is required' }, { status: 400 });
  }

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(documents)
      .where(eq(documents.permitId, permitId))
      .orderBy(desc(documents.uploadedAt));

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    const message = error instanceof Error ? error.message : 'Unknown';
    if (message.includes('DATABASE_URL')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}
