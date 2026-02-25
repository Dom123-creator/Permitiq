import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/storage/r2';
import { getDb, documents } from '@/lib/db';

const ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_SIZE = 25 * 1024 * 1024; // 25MB

// POST /api/documents/upload - Upload a document
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const permitId = formData.get('permitId') as string | null;
    const documentType = formData.get('documentType') as string | null;

    if (!file || !permitId || !documentType) {
      return NextResponse.json(
        { error: 'file, permitId, and documentType are required' },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PDF, PNG, JPG, DOCX' },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 25MB' },
        { status: 400 }
      );
    }

    // Upload to R2
    const buffer = Buffer.from(await file.arrayBuffer());
    const { key, url } = await uploadFile(buffer, file.name, file.type, permitId);

    // Save metadata to database
    const db = getDb();
    const [document] = await db
      .insert(documents)
      .values({
        permitId,
        type: documentType,
        filename: file.name,
        storageUrl: key, // store the R2 key; generate signed URL on download
        size: file.size,
        version: 1,
      })
      .returning();

    return NextResponse.json(
      {
        id: document.id,
        permitId: document.permitId,
        filename: document.filename,
        type: document.type,
        size: file.size,
        version: document.version,
        storageUrl: url,
        uploadedAt: document.uploadedAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Upload failed:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('DATABASE_URL')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    if (message.includes('R2') || message.includes('credentials')) {
      return NextResponse.json({ error: 'File storage not configured' }, { status: 503 });
    }

    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
