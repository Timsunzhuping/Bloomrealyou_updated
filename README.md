# Custom Merch Platform

AI-powered Custom Products & Corporate Merchandise Platform — a global storefront
for custom T-shirts, hoodies, mugs, hats, tote bags, and stickers, with an AI
design assistant, dynamic pricing, corporate RFQ flow, and a full back-office.

This repository contains the WP-00 monorepo skeleton. Domain functionality is
added incrementally in subsequent work packages.

---

## Tech Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **Language:** TypeScript everywhere
- **Frontend / Admin:** Next.js (App Router) + Tailwind CSS + shadcn/ui-style UI package + next-intl (planned)
- **API:** NestJS
- **ORM:** Prisma + PostgreSQL
- **Cache / Queue:** Redis + BullMQ (planned)
- **Storage:** S3-compatible object storage (MinIO in development)
- **Payments:** Stripe + PayPal adapter (planned)
- **AI / Email:** Provider adapters (mock implementations in development)

## Repository Layout

```
custom-merch-platform/
├── apps/
│   ├── web/          # Customer storefront (Next.js)
│   ├── admin/        # Back-office console (Next.js)
│   └── api/          # NestJS API service
├── packages/
│   ├── ui/           # Shared React UI components (shadcn/ui base)
│   ├── shared/       # Shared types, constants, utilities
│   ├── i18n/         # Locale resources (en, zh-CN, es, ar)
│   ├── db/           # Prisma schema, migrations, seed
│   ├── sdk/          # Typed API client used by apps/web and apps/admin
│   └── config/       # Shared TS / ESLint / Prettier / Tailwind configs
├── docker-compose.yml
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
└── README.md
```

## Prerequisites

- Node.js **20+**
- pnpm **10+**
- Docker (for local Postgres, Redis, MinIO)

## Getting Started

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment template
cp .env.example .env

# 3. Start local infrastructure (Postgres, Redis, MinIO)
docker compose up -d

# 4. (Optional) Generate Prisma client
pnpm --filter @custom-merch/db prisma:generate

# 5. Start everything in dev mode
pnpm dev
```

### Run individual apps

```bash
pnpm --filter @custom-merch/api  dev    # NestJS API on http://localhost:4000
pnpm --filter @custom-merch/web  dev    # Storefront on http://localhost:3000
pnpm --filter @custom-merch/admin dev   # Admin on http://localhost:3001
```

### Verify everything is wired up

- API health check: <http://localhost:4000/health>
- Storefront home: <http://localhost:3000>
- Admin home:    <http://localhost:3001>
- MinIO console: <http://localhost:9001> (credentials: `minioadmin` / `minioadmin`)

## Common Scripts

| Command            | Description                                  |
| ------------------ | -------------------------------------------- |
| `pnpm install`     | Install all workspace dependencies           |
| `pnpm dev`         | Run every app in dev mode (Turborepo)        |
| `pnpm build`       | Build all packages and apps                  |
| `pnpm lint`        | Lint every package and app                   |
| `pnpm typecheck`   | Type-check every package and app             |
| `pnpm test`        | Run tests for every package and app          |
| `pnpm format`      | Format the repository with Prettier          |
| `pnpm clean`       | Remove build artifacts across the monorepo   |

## Environment Variables

See [`.env.example`](./.env.example) for the full list. Key variables for local
development:

- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`
- `API_PORT` (default `4000`), `WEB_PORT` (`3000`), `ADMIN_PORT` (`3001`)
- `STRIPE_SECRET_KEY`, `PAYPAL_CLIENT_ID`, `OPENAI_API_KEY` — left empty in dev
  because the corresponding adapters use mock implementations until wired up in
  later work packages.

## Internationalization

User-visible copy must always go through the `@custom-merch/i18n` package.
Hard-coded English strings are not allowed. Supported locales out of the box:

- `en` (default)
- `zh-CN`
- `es`
- `ar` (RTL)

## Work Package Status

- [x] **WP-00** — Monorepo bootstrap, base tooling, docker-compose
- [ ] WP-01 — Database schema (products, orders, customers, suppliers, audit logs, ...)
- [ ] WP-02 — API core: auth, RBAC, audit logs, base modules
- [ ] WP-03 — Storefront catalog & product detail pages
- [ ] WP-04 — Online 2D customizer
- [ ] WP-05 — AI design assistant (mock provider)
- [ ] WP-06 — Cart, checkout, Stripe + PayPal
- [ ] WP-07 — Admin: products / orders / suppliers / production
- [ ] WP-08 — Corporate RFQ flow
- [ ] WP-09 — Email notifications, fulfillment workflow

## License

Proprietary — internal project.
