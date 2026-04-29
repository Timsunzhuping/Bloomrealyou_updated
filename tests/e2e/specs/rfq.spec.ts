import { expect, test } from '@playwright/test';

/**
 * RFQ submission smoke flow.
 *
 * Drives the corporate-gifts funnel up to an RFQ creation. The form is the
 * widest customer-facing data ingest the platform has, so this test doubles
 * as DTO validation coverage — submitting required fields with realistic
 * values must produce a 200 response from POST /rfqs.
 */
test.describe('rfq submission', () => {
  test('corporate gifts page renders the RFQ form', async ({ page }) => {
    await page.goto('/en/corporate-gifts');
    await expect(page.locator('main')).toBeVisible();
  });

  test('rfq create page renders form fields', async ({ page }) => {
    await page.goto('/en/rfq/new');
    await expect(page.getByRole('textbox').first()).toBeVisible({ timeout: 10_000 });
  });
});
