import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, documents } from '@/lib/db';
import { deleteFile } from '@/lib/storage/r2';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/documents/[id] - Get a single document
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

    return NextResponse.json(document);
  } catch (error) {
    console.error('Failed to fetch document:', error);
    const message = error instanceof Error ? error.message : 'Unknown';
    if (message.includes('DATABASE_URL')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }
}

// DELETE /api/documents/[id] - Delete a document and its R2 object
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const db = getDb();

    // Fetch first so we have the storage key
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id))
      .limit(1);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete from R2 (storageUrl holds the object key)
    await deleteFile(document.storageUrl);

    // Delete from database
    await db.delete(documents).where(eq(documents.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown';
    if (message.includes('DATABASE_URL')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
