/**
 * Shared auth helper for E2E tests.
 *
 * Logs in via the credentials form and saves session state
 * so subsequent tests can reuse the authenticated session.
 */

import { test as setup, expect } from '@playwright/test';
import path from 'path';

export const STORAGE_STATE = path.join(__dirname, '..', '.auth', 'user.json');

// Default seed credentials
const EMAIL = process.env.E2E_EMAIL ?? 'admin@permitiq.dev';
const PASSWORD = process.env.E2E_PASSWORD ?? 'permitiq-dev';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('h1')).toContainText('Sign in');

  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard (URL no longer /login)
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });

  // Verify we reached the dashboard
  await expect(page).not.toHaveURL(/\/login/);

  // Save signed-in state
  await page.context().storageState({ path: STORAGE_STATE });
});
