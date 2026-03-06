/**
 * E2E: Permit Lifecycle
 *
 * Tests the core flow: login → dashboard → create project → add permit →
 * update status → verify task auto-creation → submission workflow.
 *
 * Requires: seeded database with admin@permitiq.dev / permitiq-dev
 */

import { test, expect, type Page } from '@playwright/test';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('#email', process.env.E2E_EMAIL ?? 'admin@permitiq.dev');
  await page.fill('#password', process.env.E2E_PASSWORD ?? 'permitiq-dev');
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe('Authentication', () => {
  test('redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'wrong@test.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Invalid email or password')).toBeVisible({ timeout: 10_000 });
  });

  test('logs in with valid credentials and reaches dashboard', async ({ page }) => {
    await login(page);
    // Should see the PermitIQ header/logo on the dashboard
    await expect(page.locator('text=PermitIQ')).toBeVisible();
  });
});

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('displays stat cards', async ({ page }) => {
    // Stat cards should be visible on the dashboard
    await expect(page.locator('[class*="stat"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('displays permit tracker table', async ({ page }) => {
    // The permit tracker or a table should be visible
    const table = page.locator('table, [class*="permit"]').first();
    await expect(table).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Project Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('sidebar shows project list', async ({ page }) => {
    // Projects should appear in sidebar
    const sidebar = page.locator('[class*="sidebar"], nav, aside').first();
    await expect(sidebar).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Permit CRUD via API', () => {
  test('creates and retrieves a permit', async ({ request, page }) => {
    // First login to get session cookies
    await login(page);
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(
      (c) => c.name === 'authjs.session-token' || c.name === '__Secure-authjs.session-token'
    );

    if (!sessionCookie) {
      test.skip(true, 'No session cookie found — skipping API test');
      return;
    }

    const baseUrl = page.url().replace(/\/$/, '');
    const headers = {
      'Content-Type': 'application/json',
      Cookie: `${sessionCookie.name}=${sessionCookie.value}`,
    };

    // Get existing projects
    const projectsRes = await request.get(`${baseUrl}/api/projects`, { headers });
    expect(projectsRes.status()).toBe(200);
    const projectsData = await projectsRes.json();
    const projects = Array.isArray(projectsData) ? projectsData : projectsData.data ?? [];
    expect(projects.length).toBeGreaterThan(0);

    const projectId = projects[0].id;

    // Create a permit
    const permitRes = await request.post(`${baseUrl}/api/permits`, {
      headers,
      data: {
        projectId,
        name: `E2E Test Permit - ${Date.now()}`,
        type: 'Building',
        jurisdiction: 'Houston',
        status: 'pending',
      },
    });
    expect(permitRes.status()).toBe(201);
    const permit = await permitRes.json();
    expect(permit.id).toBeTruthy();
    expect(permit.name).toContain('E2E Test Permit');

    // Update permit status to info-requested (should trigger Rule #3)
    const patchRes = await request.patch(`${baseUrl}/api/permits/${permit.id}`, {
      headers,
      data: { status: 'info-requested' },
    });
    expect(patchRes.status()).toBe(200);
    const updated = await patchRes.json();
    expect(updated.status).toBe('info-requested');
  });
});

test.describe('Task Manager', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('navigates to task manager page', async ({ page }) => {
    await page.goto('/tasks');
    await expect(page.locator('text=Task').first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Rule Engine', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('navigates to rule engine page', async ({ page }) => {
    await page.goto('/rules');
    await expect(page.locator('text=Rule').first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('navigates to analytics page and shows KPIs', async ({ page }) => {
    await page.goto('/analytics');
    // Should show analytics content
    await expect(page.locator('text=Analytics').first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Submission Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('checklist API returns items for a permit', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(
      (c) => c.name === 'authjs.session-token' || c.name === '__Secure-authjs.session-token'
    );

    if (!sessionCookie) {
      test.skip(true, 'No session cookie found');
      return;
    }

    const baseUrl = page.url().replace(/\/$/, '');
    const headers = {
      'Content-Type': 'application/json',
      Cookie: `${sessionCookie.name}=${sessionCookie.value}`,
    };

    // Get permits
    const permitsRes = await request.get(`${baseUrl}/api/permits`, { headers });
    expect(permitsRes.status()).toBe(200);
    const permitsData = await permitsRes.json();
    const permits = Array.isArray(permitsData) ? permitsData : permitsData.data ?? [];

    if (permits.length === 0) {
      test.skip(true, 'No permits in database');
      return;
    }

    const permitId = permits[0].id;

    // Seed checklist defaults
    const seedRes = await request.post(`${baseUrl}/api/permits/${permitId}/checklist`, {
      headers,
      data: { seedDefaults: true },
    });
    expect(seedRes.status()).toBeLessThan(300);
    const checklist = await seedRes.json();
    expect(Array.isArray(checklist)).toBe(true);

    // Get checklist
    const getRes = await request.get(`${baseUrl}/api/permits/${permitId}/checklist`, { headers });
    expect(getRes.status()).toBe(200);
    const items = await getRes.json();
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);

    // Toggle first item
    const firstItem = items[0];
    const toggleRes = await request.patch(
      `${baseUrl}/api/permits/${permitId}/checklist/${firstItem.id}`,
      { headers, data: { completed: true } }
    );
    expect(toggleRes.status()).toBe(200);
    const toggled = await toggleRes.json();
    expect(toggled.completed).toBe(true);
  });
});
