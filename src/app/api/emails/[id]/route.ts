import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, emailDrafts, users } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guards';
import { sendEmail, emailDraftHtml } from '@/lib/email/sendgrid';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/emails/[id] — update status, subject, body, recipient, etc.
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;
  const session = sessionOrError;

  const { id } = await params;
  try {
    const body = await request.json();
    const db = getDb();

    const [existing] = await db
      .select()
      .from(emailDrafts)
      .where(eq(emailDrafts.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if ('subject' in body) updates.subject = body.subject;
    if ('body' in body) updates.body = body.body;
    if ('recipient' in body) updates.recipient = body.recipient;
    if ('recipientName' in body) updates.recipientName = body.recipientName;
    if ('status' in body) updates.status = body.status;
    if ('sentAt' in body) updates.sentAt = body.sentAt ? new Date(body.sentAt) : null;

    // If approving/sending, stamp sentAt + reviewedBy
    if (body.status === 'sent') {
      updates.sentAt = new Date();
      updates.reviewedBy = session.user.id;
    }

    const [updated] = await db
      .update(emailDrafts)
      .set(updates)
      .where(eq(emailDrafts.id, id))
      .returning();

    // Send the email when status transitions to 'sent'
    if (body.status === 'sent' && existing.status !== 'sent') {
      const recipientEmail = updated.recipient ?? body.recipient;
      if (recipientEmail) {
        void sendEmail({
          to: recipientEmail,
          toName: updated.recipientName ?? undefined,
          subject: updated.subject,
          html: emailDraftHtml({
            subject: updated.subject,
            body: updated.body,
            recipientName: updated.recipientName ?? undefined,
          }),
          text: updated.body,
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/emails/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to update draft' }, { status: 500 });
  }
}

// DELETE /api/emails/[id]
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  try {
    const db = getDb();
    const [deleted] = await db
      .delete(emailDrafts)
      .where(eq(emailDrafts.id, id))
      .returning();

    if (!deleted) return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/emails/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 });
  }
}
