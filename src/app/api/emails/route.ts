import { NextRequest, NextResponse } from 'next/server';
import { eq, and, ne, or } from 'drizzle-orm';
import { getDb, emailDrafts, permits, projects } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guards';

// GET /api/emails?status=active|sent|all
export async function GET(request: NextRequest) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') ?? 'active'; // active | sent | all

    const db = getDb();

    const conditions = statusFilter === 'sent'
      ? [eq(emailDrafts.status, 'sent')]
      : statusFilter === 'active'
      ? [ne(emailDrafts.status, 'sent'), ne(emailDrafts.status, 'rejected')]
      : [];

    const rows = await db
      .select({
        id: emailDrafts.id,
        permitId: emailDrafts.permitId,
        taskId: emailDrafts.taskId,
        subject: emailDrafts.subject,
        body: emailDrafts.body,
        recipient: emailDrafts.recipient,
        recipientName: emailDrafts.recipientName,
        templateType: emailDrafts.templateType,
        createdBy: emailDrafts.createdBy,
        status: emailDrafts.status,
        sentAt: emailDrafts.sentAt,
        createdAt: emailDrafts.createdAt,
        permitName: permits.name,
        projectName: projects.name,
      })
      .from(emailDrafts)
      .leftJoin(permits, eq(emailDrafts.permitId, permits.id))
      .leftJoin(projects, eq(permits.projectId, projects.id))
      .where(conditions.length > 0 ? and(...(conditions as [typeof conditions[0], ...typeof conditions])) : undefined)
      .orderBy(emailDrafts.createdAt);

    // Reverse so newest first
    return NextResponse.json(rows.reverse());
  } catch (error) {
    console.error('GET /api/emails failed:', error);
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('DATABASE_URL')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 });
  }
}

// POST /api/emails — create a new draft
export async function POST(request: NextRequest) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  try {
    const body = await request.json();
    const {
      permitId,
      subject,
      emailBody,
      recipient,
      recipientName,
      templateType,
      createdBy,
    } = body;

    if (!subject || !emailBody) {
      return NextResponse.json({ error: 'subject and body are required' }, { status: 400 });
    }

    const db = getDb();
    const [draft] = await db
      .insert(emailDrafts)
      .values({
        permitId: permitId ?? null,
        subject,
        body: emailBody,
        recipient: recipient ?? null,
        recipientName: recipientName ?? null,
        templateType: templateType ?? 'custom',
        createdBy: createdBy ?? 'user',
        status: 'draft',
      })
      .returning();

    return NextResponse.json(draft, { status: 201 });
  } catch (error) {
    console.error('POST /api/emails failed:', error);
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('DATABASE_URL')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to create draft' }, { status: 500 });
  }
}
