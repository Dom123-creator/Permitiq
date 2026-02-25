import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, documents } from '@/lib/db';
import { getDownloadUrl } from '@/lib/storage/r2';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/documents/[id]/download - Get a presigned download URL (1h TTL)
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const db = getDb();
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id))
      .limit(1);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // storageUrl stores the R2 object key (set during upload)
    const url = await getDownloadUrl(document.storageUrl);

    return NextResponse.json({ url, filename: document.filename });
  } catch (error) {
    console.error('Failed to generate download URL:', error);
    const message = error instanceof Error ? error.message : 'Unknown';
    if (message.includes('DATABASE_URL')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    if (message.includes('R2') || message.includes('credentials')) {
      return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
  }
}
