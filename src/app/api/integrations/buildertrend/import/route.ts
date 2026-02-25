import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/guards';
import { getDb, projects, permits } from '@/lib/db';
import { parseBuildertrend, mapRowToPermit } from '@/lib/integrations/buildertrend';
import type { BuildertrendImportResult } from '@/types';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// POST /api/integrations/buildertrend/import — import from CSV
export async function POST(request: NextRequest) {
  const sessionOrError = await requireRole(['owner', 'admin', 'pm']);
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/csv') {
      return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds 5MB limit' }, { status: 400 });
    }

    const csvContent = await file.text();
    const rows = parseBuildertrend(csvContent);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'CSV file is empty or has no valid rows' }, { status: 400 });
    }

    const db = getDb();
    const result: BuildertrendImportResult = { projectsCreated: 0, permitsCreated: 0, skipped: 0, errors: [] };

    // Group rows by project name
    const byProject = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = row.projectName.trim();
      if (!key) {
        result.errors.push(`Row with permit "${row.permitName}" has no project name — skipped`);
        result.skipped++;
        continue;
      }
      if (!byProject.has(key)) byProject.set(key, []);
      byProject.get(key)!.push(row);
    }

    for (const [projectName, projectRows] of Array.from(byProject)) {
      // Upsert project by name
      let projectId: string;
      const [existingProject] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.name, projectName))
        .limit(1);

      if (existingProject) {
        projectId = existingProject.id;
      } else {
        const [created] = await db.insert(projects).values({
          name: projectName,
          status: 'active',
        }).returning();
        projectId = created.id;
        result.projectsCreated++;
      }

      // Insert permits
      for (const row of projectRows) {
        if (!row.permitName.trim()) {
          result.skipped++;
          continue;
        }

        // Skip duplicate permit numbers
        if (row.permitNumber) {
          const [existingPermit] = await db
            .select({ id: permits.id })
            .from(permits)
            .where(eq(permits.permitNumber, row.permitNumber))
            .limit(1);

          if (existingPermit) {
            result.errors.push(`Permit number "${row.permitNumber}" already exists — skipped`);
            result.skipped++;
            continue;
          }
        }

        try {
          const permitData = mapRowToPermit(row);
          await db.insert(permits).values({
            projectId,
            name: permitData.name,
            type: permitData.type,
            jurisdiction: permitData.jurisdiction,
            permitNumber: permitData.permitNumber,
            status: permitData.status,
            submittedAt: permitData.submittedAt,
            expiryDate: permitData.expiryDate,
            feeBudgeted: permitData.feeBudgeted,
            notes: permitData.notes,
          });
          result.permitsCreated++;
        } catch (err) {
          result.errors.push(`Permit "${row.permitName}": ${err instanceof Error ? err.message : String(err)}`);
          result.skipped++;
        }
      }
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('POST /api/integrations/buildertrend/import failed:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
