import { defineConfig, devices } from '@playwright/test';

/**
 * Bloomrealyou Playwright config.
 *
 * The suite assumes three locally-running servers:
 *   - storefront → http://localhost:3000
 *   - admin      → http://localhost:3001
 *   - api        → http://localhost:4000
 *
 * Override via env:
 *   E2E_WEB_URL / E2E_ADMIN_URL / E2E_API_URL
 *
 * In CI, the workflow boots the same three servers via `pnpm dev` against the
 * mock providers (no real Stripe / SendGrid keys needed). Locally you can
 * either run them yourself or rely on the `webServer` block below to start
 * them on demand.
 */
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './specs',
  timeout: 60_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_WEB_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Firefox / WebKit kept commented for now — the smoke flows only need one
    // engine to catch regressions and CI minutes are precious.
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit',  use: { ...devices['Desktop Safari'] } },
  ],
});
