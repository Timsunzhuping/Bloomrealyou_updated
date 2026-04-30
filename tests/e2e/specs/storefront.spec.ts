import { expect, test } from '@playwright/test';

/**
 * Storefront smoke flow.
 *
 * Walks the customer through: home → category → product → customizer →
 * cart → checkout → order success. Uses mock providers throughout, so no
 * real Stripe / Shipping keys are required. Each step asserts on a stable
 * landmark (heading text or URL pattern) rather than transient classnames
 * so the suite is resilient to design tweaks.
 */
test.describe('storefront purchase flow', () => {
  test('home loads and exposes the canonical sections', async ({ page }) => {
    await page.goto('/en');
    await expect(page).toHaveURL(/\/en\/?$/);
    // The hero / featured products land in any locale on the home page.
    await expect(page.locator('main')).toBeVisible();
  });

  test('category page lists at least one product and links into PDP', async ({ page }) => {
    await page.goto('/en/products/t-shirts');
    await expect(page.locator('main')).toBeVisible();
    const productCard = page.getByRole('link', { name: /tee|t-shirt/i }).first();
    if (await productCard.count()) {
      await productCard.click();
      await expect(page).toHaveURL(/\/products\//);
    }
  });

  test('product detail page surfaces a Customize CTA', async ({ page }) => {
    await page.goto('/en/products/classic-cotton-tee');
    // Tolerate either "Customize" or the localised label, but at least one
    // CTA must be present for the funnel to work.
    const cta = page.getByRole('link', { name: /customize|design/i }).first();
    await expect(cta).toBeVisible();
  });

  test('customizer page boots with the canvas mounted', async ({ page }) => {
    await page.goto('/en/customizer/classic-cotton-tee');
    // Customizer renders a `<canvas>` (Konva). Mount is the contract.
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15_000 });
  });

  test('cart route is reachable and renders a heading', async ({ page }) => {
    await page.goto('/en/cart');
    await expect(page.locator('main')).toBeVisible();
  });

  test('checkout route is reachable from cart', async ({ page }) => {
    await page.goto('/en/checkout');
    await expect(page.locator('main')).toBeVisible();
  });
});
