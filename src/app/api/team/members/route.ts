import { NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/guards';
import { getDb, users, projectMembers, projects } from '@/lib/db';

// GET /api/team/members — list all users with project memberships (admin/owner only)
export async function GET() {
  const sessionOrError = await requireRole(['owner', 'admin']);
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  try {
    const db = getDb();

    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        projectCount: sql<number>`cast(count(distinct ${projectMembers.projectId}) as int)`,
      })
      .from(users)
      .leftJoin(projectMembers, eq(projectMembers.userId, users.id))
      .groupBy(users.id)
      .orderBy(users.createdAt);

    // Fetch project names per user
    const memberships = await db
      .select({
        userId: projectMembers.userId,
        projectId: projectMembers.projectId,
        projectName: projects.name,
      })
      .from(projectMembers)
      .leftJoin(projects, eq(projectMembers.projectId, projects.id));

    const membershipMap: Record<string, Array<{ projectId: string; projectName: string }>> = {};
    for (const m of memberships) {
      if (!membershipMap[m.userId]) membershipMap[m.userId] = [];
      membershipMap[m.userId].push({ projectId: m.projectId, projectName: m.projectName ?? '' });
    }

    const result = rows.map((r) => ({
      ...r,
      projects: membershipMap[r.id] ?? [],
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/team/members failed:', error);
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}
