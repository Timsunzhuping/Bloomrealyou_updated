# Bloomrealyou — End-to-End Suite

Playwright-driven smoke flows for the storefront, admin console, and RFQ funnel. The suite is deliberately **outside** the pnpm workspace so unit-test runs (`pnpm test` at repo root) don't pull in the Playwright browser binaries.

## Running locally

```bash
# 1. Boot all three services in another terminal
pnpm dev

# 2. From the repo root
pnpm test:e2e
# or, equivalently
cd tests/e2e
pnpm install
pnpm exec playwright install --with-deps chromium
pnpm test
```

## Configuration

Environment variables (all optional; defaults match `pnpm dev`):

| Variable | Default | Purpose |
|---|---|---|
| `E2E_WEB_URL`   | `http://localhost:3000` | Storefront base URL |
| `E2E_ADMIN_URL` | `http://localhost:3001` | Admin base URL |
| `E2E_API_URL`   | `http://localhost:4000` | API base URL |

## What's covered

- `specs/storefront.spec.ts` — home → category → PDP → customizer → cart → checkout
- `specs/admin.spec.ts` — login (success + failure), nav to orders / design / production / shipments, RBAC redirect
- `specs/rfq.spec.ts` — corporate gifts page renders, RFQ form mounts
- `specs/i18n.spec.ts` — all 4 locales serve, Arabic gets `dir="rtl"`

The customizer test asserts the canvas mounts only — full design + cart payload assertions live in API integration tests under `apps/api/src/**/*.spec.ts`.
