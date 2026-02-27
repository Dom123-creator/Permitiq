import { NextRequest, NextResponse } from 'next/server';
import { eq, asc, ilike, or, and } from 'drizzle-orm';
import { getDb, jurisdictions } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guards';

// GET /api/markets?metro=&state=&tier=&q=
export async function GET(request: NextRequest) {
  const sessionOrError = await requireAuth();
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  try {
    const { searchParams } = new URL(request.url);
    const metro = searchParams.get('metro');
    const state = searchParams.get('state');
    const tier = searchParams.get('tier');
    const q = searchParams.get('q');

    const db = getDb();

    const rows = await db
      .select()
      .from(jurisdictions)
      .where(
        and(
          state ? eq(jurisdictions.state, state) : undefined,
          tier ? eq(jurisdictions.marketTier, parseInt(tier, 10)) : undefined,
          metro ? ilike(jurisdictions.metro, `%${metro}%`) : undefined,
          q
            ? or(
                ilike(jurisdictions.city, `%${q}%`),
                ilike(jurisdictions.metro, `%${q}%`),
                ilike(jurisdictions.ahjName, `%${q}%`)
              )
            : undefined
        )
      )
      .orderBy(asc(jurisdictions.marketTier), asc(jurisdictions.metro), asc(jurisdictions.city));

    // Parse JSON fields
    const enriched = rows.map((r) => ({
      ...r,
      primarySectors: r.primarySectors ? (JSON.parse(r.primarySectors) as string[]) : [],
    }));

    // Group by metro for the UI
    const byMetro = enriched.reduce<Record<string, typeof enriched>>((acc, row) => {
      if (!acc[row.metro]) acc[row.metro] = [];
      acc[row.metro].push(row);
      return acc;
    }, {});

    return NextResponse.json({ jurisdictions: enriched, byMetro });
  } catch (error) {
    console.error('GET /api/markets failed:', error);
    const msg = error instanceof Error ? error.message : 'Unknown';
    if (msg.includes('DATABASE_URL')) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to fetch markets' }, { status: 500 });
  }
}
