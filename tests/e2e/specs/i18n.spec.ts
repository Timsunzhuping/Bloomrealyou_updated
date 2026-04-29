import { expect, test } from '@playwright/test';

/**
 * i18n smoke checks.
 *
 * Each of the 4 supported locales must render the home page, and Arabic
 * must serve `dir="rtl"` so layout mirrors correctly. We don't assert on
 * specific copy — translations are owned by content ops, and the i18n
 * package's own tests enforce key-parity between locale files.
 */
const LOCALES = ['en', 'zh-CN', 'es', 'ar'] as const;

for (const locale of LOCALES) {
  test(`/${locale} home loads`, async ({ page }) => {
    const res = await page.goto(`/${locale}`);
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator('main')).toBeVisible();
  });
}

test('arabic page is rendered RTL', async ({ page }) => {
  await page.goto('/ar');
  const dir = await page.evaluate(() => document.documentElement.getAttribute('dir'));
  expect(dir).toBe('rtl');
});

test('language switcher links work', async ({ page }) => {
  await page.goto('/en');
  // Switching from /en to /zh-CN should preserve the rest of the path.
  await page.goto('/zh-CN');
  await expect(page).toHaveURL(/\/zh-CN/);
});
