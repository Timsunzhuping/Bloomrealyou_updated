# Deployment Guide

Bloomrealyou ships as three Node.js services + Postgres + Redis + S3-compatible object storage. Anywhere you can run those, you can run Bloomrealyou. The reference target is **Linux + Docker**, but every step in this doc has explicit notes for AWS, Vercel, Render, Railway, and Kubernetes operators.

## 1. Architecture at a glance

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  apps/web        │    │  apps/admin      │    │  apps/api        │
│  (Next.js)       │    │  (Next.js)       │    │  (NestJS)        │
│  port 3000       │    │  port 3001       │    │  port 4000       │
└────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘
         │                       │                       │
         └───────────────────────┴───────────┬───────────┘
                                             │
                          ┌──────────────────┼──────────────────┐
                          │                  │                  │
                    ┌─────▼────┐      ┌──────▼─────┐      ┌─────▼─────┐
                    │ Postgres │      │   Redis    │      │ S3-compat │
                    │  16+     │      │  7+        │      │  storage  │
                    └──────────┘      └────────────┘      └───────────┘
```

The two Next.js apps are pure presentation; all state lives in Postgres + Redis + object storage and is owned by the API service. There is no internal RPC between the Next.js apps and the API beyond standard HTTP.

## 2. Prerequisites

- Node.js **20+**
- pnpm **10+** (matches `package.json`'s `packageManager` pin)
- Docker **24+** if using the bundled images
- Postgres **16+** (extensions: `uuid-ossp`)
- Redis **7+**
- An S3-compatible bucket (MinIO works for self-hosting; AWS S3 / GCS / R2 are supported via the `@aws-sdk/client-s3` adapter)
- Stripe account with a webhook endpoint configured for `payment_intent.*`

## 3. Quick start with Docker Compose

```bash
cp .env.example .env.prod
# Fill in DATABASE_URL, REDIS_URL, MINIO_*, STRIPE_*, JWT_SECRET, etc.

cp docker-compose.prod.example.yml docker-compose.prod.yml
# Tweak ports / build args if needed.

docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

This brings up Postgres, Redis, MinIO, plus the three app services. To boot only the apps (DB managed elsewhere), comment out the `postgres` / `redis` / `minio` services and point the corresponding `*_URL` envs at your managed instances.

After the stack is healthy:

```bash
# Run migrations (one-shot)
docker compose -f docker-compose.prod.yml exec api node node_modules/prisma/build/index.js migrate deploy

# Seed demo data (optional, for staging)
docker compose -f docker-compose.prod.yml exec api node node_modules/prisma/build/index.js db seed
```

## 4. Building images individually

Each app has a `Dockerfile` at `apps/<name>/Dockerfile`. **Build with the repo root as the build context** — workspace packages aren't visible otherwise.

```bash
docker build -f apps/api/Dockerfile   -t bloomrealyou/api:latest   .
docker build -f apps/web/Dockerfile   -t bloomrealyou/web:latest   . \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com
docker build -f apps/admin/Dockerfile -t bloomrealyou/admin:latest . \
  --build-arg NEXT_PUBLIC_ADMIN_API_BASE_URL=https://api.example.com
```

`NEXT_PUBLIC_*` build args are baked into the Next.js bundle — set them at build time, not runtime.

## 5. Cloud-specific notes

### AWS (ECS Fargate or App Runner)

- Push images to ECR. The Dockerfiles are multi-arch friendly (`docker buildx build --platform linux/amd64,linux/arm64`).
- Use **RDS Postgres 16** (`db.t4g.medium` is enough for staging) and **ElastiCache Redis 7**.
- Bucket: a private S3 bucket. Set `S3_FORCE_PATH_STYLE=false` and pass `S3_REGION` so the AWS SDK signs correctly.
- Stripe webhook endpoint: `https://api.example.com/payments/webhook/stripe`. Enable signature verification (`STRIPE_WEBHOOK_REQUIRE_SIGNATURE=true`).
- PayPal webhook endpoint: `https://api.example.com/payments/webhook/paypal`. Set `PAYPAL_WEBHOOK_ID`, enable signature verification (`PAYPAL_WEBHOOK_REQUIRE_SIGNATURE=true`), and only then enable the storefront option with `NEXT_PUBLIC_ENABLE_PAYPAL_CHECKOUT=true`.
- The customizer writes production artifacts under `designs/{designId}/production.{png,svg,pdf}` and `designs/{designId}/source.json`. Confirm the API role can write these keys before accepting live customized orders.
- Health check: `GET /health` on the API; Next.js apps reply on `/api/health` (root is fine for k8s probes too).

### Vercel

- Deploy `apps/web` and `apps/admin` as separate Vercel projects. Each project's **Root Directory** is `apps/web` (or `apps/admin`), the **Framework Preset** is "Next.js", and the **Install Command** is `pnpm install --frozen-lockfile`.
- Add `NEXT_PUBLIC_API_BASE_URL` to the project's environment variables (Production + Preview).
- The API runs on a separate platform — Vercel doesn't host long-running NestJS workers well. Pair with Render / Railway / Fly / EC2 for `apps/api`.

### Render

- Three services: `web` (Web Service, runtime Docker, Dockerfile `apps/web/Dockerfile`), `admin` (same, `apps/admin/Dockerfile`), `api` (Web Service, Dockerfile `apps/api/Dockerfile`).
- One **Render Postgres** + **Render Redis** instance.
- Configure `Auto Deploy` on the `main` branch.

### Railway

- Equivalent setup. Use the **Deploy from Dockerfile** template per service. Postgres + Redis are first-class plugins.

### Kubernetes

- Each app gets a Deployment + Service. Probe `/health`. Resource ballpark per pod:
  - api: 256 Mi / 250 m CPU
  - web: 256 Mi / 200 m CPU
  - admin: 192 Mi / 150 m CPU
- Mount your secret manager at `/run/secrets` and inject env vars from there.
- For the BullMQ + Redis idempotency stores to share state across pods, set `IDEMPOTENCY_STORE_BACKEND=redis` and `NOTIFICATIONS_QUEUE_DRIVER=bullmq` with `BULLMQ_REDIS_URL` pointed at the same Redis instance.

## 6. Migrations & seeding

Run from anywhere with `DATABASE_URL` set:

```bash
pnpm db:migrate:deploy   # apply pending migrations
pnpm db:seed             # demo data (admins, products, RFQs)
```

`pnpm db:migrate` is the dev-mode flow — it generates new migrations from schema diffs. Don't run it in production.

## 7. Object storage bucket setup

The platform assumes a single bucket with public-read policies on `products/*`, `templates/*`, `designs/*`, and private on everything else. For MinIO:

```bash
mc alias set local http://localhost:9000 minioadmin minioadmin
mc mb local/bloomrealyou-uploads
mc anonymous set-json /tmp/policy.json local/bloomrealyou-uploads
```

For AWS S3, use a CloudFront distribution in front of public objects + a signed-URL workflow for private ones. The storage adapter handles signing on its end.

Customized order assets are stored in `designs/{designId}/`. The checkout flow generates a print-area PNG plus SVG/PDF/source JSON before adding the item to the cart; if storage writes fail, customized checkout should fail closed instead of creating an order without a production file.

## 8. CDN / TLS

- Storefront and admin should be behind a CDN that respects `Cache-Control: private` on per-user routes (anything under `/account`, `/admin`, `/cart`).
- Origin certs come from the same provider that owns DNS — Let's Encrypt for self-host, ACM for AWS, automatic for Render / Railway / Vercel.

## 9. Rolling out an update

1. Tag a release commit on `main`.
2. CI builds and pushes images to your registry (see `.github/workflows/ci.yml` for the build matrix).
3. `pnpm db:migrate:deploy` first (zero-downtime migrations only — use `prisma migrate diff` to review).
4. Roll the API service.
5. Roll the web + admin services.
6. Verify with the [Release Checklist](release-checklist.md).

If migrations include a destructive change, gate the deploy behind a maintenance window and snapshot Postgres first.

## 10. Rollback

Every deploy uses an immutable image tag. To roll back:

```bash
docker compose -f docker-compose.prod.yml pull <service>
IMAGE_TAG=<previous-tag> docker compose -f docker-compose.prod.yml up -d <service>
```

Migrations are forward-only by default. If you need to revert schema changes, restore from the pre-deploy snapshot — Prisma does not generate `down` migrations.
