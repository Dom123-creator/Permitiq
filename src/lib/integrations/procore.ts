import { eq, and } from 'drizzle-orm';
import { getDb, integrations, projects, permits } from '@/lib/db';
import type { SyncResult } from '@/types';

const PROCORE_API = 'https://api.procore.com';
const PROCORE_AUTH = 'https://login.procore.com';

const STATUS_MAP: Record<string, string> = {
  open: 'under-review',
  approved: 'approved',
  revise_resubmit: 'info-requested',
  pending: 'pending',
  rejected: 'rejected',
  void: 'rejected',
};

/** Auto-refresh the integration token if expiring within 5 minutes. Returns updated integration row. */
async function getValidIntegration(userId: string) {
  const db = getDb();
  const [integration] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.userId, userId), eq(integrations.provider, 'procore')))
    .limit(1);

  if (!integration?.accessToken) return null;

  // Check if token expires within 5 minutes
  const fiveMinutes = 5 * 60 * 1000;
  if (integration.expiresAt && new Date(integration.expiresAt).getTime() - Date.now() < fiveMinutes) {
    if (!integration.refreshToken) return null;

    const tokenRes = await fetch(`${PROCORE_AUTH}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: process.env.PROCORE_CLIENT_ID,
        client_secret: process.env.PROCORE_CLIENT_SECRET,
        refresh_token: integration.refreshToken,
      }),
    });

    if (!tokenRes.ok) return null;

    const tokens = await tokenRes.json();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await db
      .update(integrations)
      .set({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, integration.id));

    return { ...integration, accessToken: tokens.access_token };
  }

  return integration;
}

/** Authenticated fetch to Procore REST API */
async function procoreFetch(path: string, integration: { accessToken: string; providerData: string | null }, options?: RequestInit) {
  let companyId: string | null = null;
  if (integration.providerData) {
    try {
      const data = JSON.parse(integration.providerData);
      companyId = data.companyId ?? null;
    } catch { /* ignore */ }
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${integration.accessToken}`,
    'Content-Type': 'application/json',
    ...(companyId ? { 'Procore-Company-Id': String(companyId) } : {}),
    ...((options?.headers as Record<string, string>) ?? {}),
  };

  return fetch(`${PROCORE_API}${path}`, { ...options, headers });
}

/** Get all companies accessible to the user */
export async function getCompanies(userId: string) {
  const integration = await getValidIntegration(userId);
  if (!integration) throw new Error('Procore not connected');

  const res = await procoreFetch('/rest/v1.0/companies', integration);
  if (!res.ok) throw new Error(`Procore API error: ${res.status}`);
  return res.json();
}

/** Get all projects in a company */
export async function getProcoreProjects(userId: string, companyId: number) {
  const integration = await getValidIntegration(userId);
  if (!integration) throw new Error('Procore not connected');

  const withCompany = { ...integration, providerData: JSON.stringify({ companyId }) };
  const res = await procoreFetch(`/rest/v1.0/projects?company_id=${companyId}`, withCompany);
  if (!res.ok) throw new Error(`Procore API error: ${res.status}`);
  return res.json();
}

/** Get submittals for a project (mapped as permit items) */
async function getSubmittals(userId: string, companyId: number, projectId: number) {
  const integration = await getValidIntegration(userId);
  if (!integration) throw new Error('Procore not connected');

  const withCompany = { ...integration, providerData: JSON.stringify({ companyId }) };
  const res = await procoreFetch(`/rest/v1.0/projects/${projectId}/submittals`, withCompany);
  if (!res.ok) return [];
  return res.json();
}

/** Sync Procore projects and permits into PermitIQ */
export async function syncProcore(userId: string, companyId: number, procoreProjectId?: number): Promise<SyncResult> {
  const db = getDb();
  const result: SyncResult = { projectsCreated: 0, projectsUpdated: 0, permitsCreated: 0, permitsUpdated: 0, errors: [] };

  const procoreProjects = procoreProjectId
    ? [await getProcoreProjects(userId, companyId).then((p: Array<{id: number; name: string; status: string}>) => p.find((x) => x.id === procoreProjectId)).then((p) => { if (!p) throw new Error('Project not found'); return p; })]
    : await getProcoreProjects(userId, companyId);

  for (const pp of procoreProjects as Array<{ id: number; name: string; status: string }>) {
    try {
      // Upsert project
      const [existing] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.procoreId, String(pp.id)))
        .limit(1);

      let projectId: string;
      if (existing) {
        await db.update(projects).set({ name: pp.name, updatedAt: new Date() }).where(eq(projects.id, existing.id));
        projectId = existing.id;
        result.projectsUpdated++;
      } else {
        const [created] = await db.insert(projects).values({
          name: pp.name,
          status: 'active',
          procoreId: String(pp.id),
        }).returning();
        projectId = created.id;
        result.projectsCreated++;
      }

      // Sync submittals as permits
      const submittals = await getSubmittals(userId, companyId, pp.id);
      for (const sub of submittals as Array<{ id: number; title: string; status: string; spec_section_description?: string }>) {
        const mappedStatus = STATUS_MAP[sub.status] ?? 'pending';

        const [existingPermit] = await db
          .select({ id: permits.id })
          .from(permits)
          .where(and(eq(permits.procoreItemId, String(sub.id)), eq(permits.projectId, projectId)))
          .limit(1);

        if (existingPermit) {
          await db.update(permits).set({ status: mappedStatus, updatedAt: new Date() }).where(eq(permits.id, existingPermit.id));
          result.permitsUpdated++;
        } else {
          await db.insert(permits).values({
            projectId,
            name: sub.title ?? `Submittal #${sub.id}`,
            type: 'Building',
            jurisdiction: 'Unknown',
            status: mappedStatus,
            procoreItemId: String(sub.id),
          });
          result.permitsCreated++;
        }
      }
    } catch (err) {
      result.errors.push(`Project ${pp.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Update lastSync in providerData
  const integration = await getValidIntegration(userId);
  if (integration) {
    let data: Record<string, unknown> = {};
    try { data = JSON.parse(integration.providerData ?? '{}'); } catch { /* ignore */ }
    data.companyId = companyId;
    data.lastSync = new Date().toISOString();
    await db.update(integrations).set({ providerData: JSON.stringify(data), updatedAt: new Date() })
      .where(and(eq(integrations.userId, userId), eq(integrations.provider, 'procore')));
  }

  return result;
}
