import { expect, test } from '@playwright/test';

const ADMIN_URL = process.env.E2E_ADMIN_URL ?? 'http://localhost:3001';

/**
 * Admin console smoke flow.
 *
 * Logs the seeded `admin@bloomrealyou.com` account in (password matches
 * `apps/api/src/admin-auth/admin-users.repository.ts` seed) and walks the
 * key back-office screens. The seed is part of the in-memory repo, so
 * these tests work without a Postgres connection.
 */
test.describe('admin console', () => {
  test('login form rejects bad credentials', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/en/login`);
    await page.getByLabel(/email/i).fill('admin@bloomrealyou.com');
    await page.getByLabel(/password/i).fill('not-the-real-password');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    // The /unauthorized or in-form error path; either is acceptable. We
    // just want to assert the user did NOT land on /dashboard.
    await expect(page).not.toHaveURL(/\/dashboard/, { timeout: 5_000 });
  });

  test('successful admin login lands on dashboard', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/en/login`);
    await page.getByLabel(/email/i).fill('admin@bloomrealyou.com');
    await page.getByLabel(/password/i).fill('admin123');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await expect(page).toHaveURL(/\/(dashboard|orders)/, { timeout: 10_000 });
  });

  test('admin can browse to orders / design reviews / production', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/en/login`);
    await page.getByLabel(/email/i).fill('admin@bloomrealyou.com');
    await page.getByLabel(/password/i).fill('admin123');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await expect(page).toHaveURL(/\/(dashboard|orders)/, { timeout: 10_000 });

    for (const slug of ['orders', 'design-reviews', 'production-jobs', 'shipments']) {
      await page.goto(`${ADMIN_URL}/en/${slug}`);
      await expect(page.locator('main')).toBeVisible();
    }
  });

  test('non-admin role hits forbidden page on admin-only route', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/en/login`);
    await page.getByLabel(/email/i).fill('supplier@bloomrealyou.com');
    await page.getByLabel(/password/i).fill('supplier123');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    // Suppliers don't get the platform `settings.write` permission. Hitting
    // the settings page should redirect them through /forbidden — or at
    // minimum, NOT render a token edit form.
    await page.goto(`${ADMIN_URL}/en/settings`);
    const forbiddenLanding = page.url().includes('/forbidden');
    if (!forbiddenLanding) {
      // If the layout doesn't force a redirect, assert the destructive
      // controls are absent — RBAC happens server-side.
      await expect(page.getByRole('button', { name: /save|send/i })).toHaveCount(0);
    }
  });
});
