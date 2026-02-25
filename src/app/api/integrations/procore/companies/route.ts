import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards';
import { getCompanies } from '@/lib/integrations/procore';

// GET /api/integrations/procore/companies — list Procore companies
export async function GET() {
  const sessionOrError = await requireRole(['owner', 'admin']);
  if (sessionOrError instanceof NextResponse) return sessionOrError;
  const session = sessionOrError;

  try {
    const companies = await getCompanies(session.user.id);
    return NextResponse.json(companies);
  } catch (error) {
    console.error('GET /api/integrations/procore/companies failed:', error);
    const msg = error instanceof Error ? error.message : 'Unknown';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
