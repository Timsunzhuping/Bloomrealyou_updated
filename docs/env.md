# Environment Variables Reference

Every variable understood by the platform. Categories follow `.env.example`. Variables marked **Required** must be set in production; the app will refuse to start without them.

## Runtime

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NODE_ENV` | yes | `development` | Controls Stripe webhook signature enforcement, log verbosity, and Next.js asset compilation. |
| `LOG_LEVEL` | no | `info` | `debug` / `info` / `warn` / `error`. |

## Public URLs

| Variable | Required | Default | Notes |
|---|---|---|---|
| `APP_URL` | yes | `http://localhost:3000` | Storefront URL — used in outbound emails and OAuth redirects. |
| `ADMIN_URL` | yes | `http://localhost:3001` | Admin URL — used in `Forbidden` redirects and admin emails. |
| `API_URL` | yes | `http://localhost:4000` | API base URL — used by Docker compose to wire NEXT_PUBLIC_* build args. |

## API service

| Variable | Required | Default | Notes |
|---|---|---|---|
| `API_PORT` | no | `4000` | |
| `API_HOST` | no | `0.0.0.0` | |
| `API_GLOBAL_PREFIX` | no | `` | Sets `app.setGlobalPrefix(...)`. Leave empty unless you front the API with a path-based proxy. |
| `API_CORS_ORIGINS` | yes (prod) | `` | Comma-separated allow-list. Must contain at least `APP_URL` and `ADMIN_URL`. |
| `API_RATE_LIMIT_BURST` | no | `120` | Per-IP token-bucket size. |
| `API_RATE_LIMIT_REFILL_PER_SEC` | no | `10` | Per-IP refill rate. |

## Storefront / Admin (Next.js)

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | yes | `http://localhost:4000` | Storefront → API. **Bake at build time.** |
| `NEXT_PUBLIC_ADMIN_API_BASE_URL` | yes | `http://localhost:4000` | Admin → API. **Bake at build time.** |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | no | `en` | One of `en` / `zh-CN` / `es` / `ar`. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | yes (prod) | `` | Stripe publishable key for the checkout client SDK. |
| `WEB_PORT` | no | `3000` | |
| `ADMIN_PORT` | no | `3001` | |

## Database (Postgres)

| Variable | Required | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | yes | `postgresql://postgres:postgres@localhost:5432/custom_merch?schema=public` | The Prisma connection string. Use connection pooling (PgBouncer / RDS Proxy) in production. |

## Cache / Queue (Redis)

| Variable | Required | Default | Notes |
|---|---|---|---|
| `REDIS_URL` | yes (prod) | `redis://localhost:6379` | Used for cart session backing, BullMQ, and Redis idempotency. |
| `IDEMPOTENCY_STORE_BACKEND` | no | `in-memory` | `redis` enables shared dedup across multiple API instances. |
| `NOTIFICATIONS_QUEUE_DRIVER` | no | `in-memory` | `bullmq` activates the BullMQ worker. |
| `BULLMQ_REDIS_URL` | when driver is `bullmq` | `` | Defaults to `REDIS_URL` if unset. |

## Object storage (S3-compatible)

`MINIO_*` and `S3_*` are aliases — set whichever group your tooling expects. The runtime resolves them in this order: `MINIO_*` first, then `S3_*`.

| Variable | Required | Default | Notes |
|---|---|---|---|
| `MINIO_ENDPOINT` / `S3_ENDPOINT` | yes (prod) | `http://localhost:9000` | Full URL (with scheme + port). For AWS S3 leave unset and let the SDK pick the regional endpoint. |
| `MINIO_ACCESS_KEY` / `S3_ACCESS_KEY_ID` | yes (prod) | `minioadmin` | |
| `MINIO_SECRET_KEY` / `S3_SECRET_ACCESS_KEY` | yes (prod) | `minioadmin` | |
| `MINIO_BUCKET` / `S3_BUCKET` | yes (prod) | `custom-merch-uploads` | |
| `S3_REGION` | no | `us-east-1` | |
| `S3_FORCE_PATH_STYLE` | no | `true` | `true` for MinIO, `false` for AWS S3. |

## Payments

| Variable | Required | Default | Notes |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | yes (prod) | `` | `sk_live_*` for prod, `sk_test_*` for staging. |
| `STRIPE_WEBHOOK_SECRET` | yes (prod) | `` | `whsec_*`. The API rejects unsigned events when `STRIPE_WEBHOOK_REQUIRE_SIGNATURE=true`. |
| `STRIPE_WEBHOOK_REQUIRE_SIGNATURE` | yes (prod) | `false` | Set to `true` in production. |
| `PAYPAL_CLIENT_ID` | no | `` | |
| `PAYPAL_CLIENT_SECRET` | no | `` | |
| `PAYPAL_ENV` | no | `sandbox` | `sandbox` or `live`. |

## AI

| Variable | Required | Default | Notes |
|---|---|---|---|
| `AI_PROVIDER` | no | `mock` | `mock` / `openai`. |
| `OPENAI_API_KEY` | when provider is `openai` | `` | |
| `OPENAI_MODEL` | no | `gpt-4o-mini` | |

## Notifications

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NOTIFICATION_PROVIDER` | no | `mock` | `mock` / `sendgrid` / `ses`. |
| `SENDGRID_API_KEY` | when provider is `sendgrid` | `` | |
| `SENDGRID_FROM_EMAIL` | no | `noreply@bloomrealyou.com` | |
| `SENDGRID_FROM_NAME` | no | `Bloomrealyou` | |
| `RESEND_API_KEY` | no | `` | Reserved for future Resend adapter. |
| `SES_ACCESS_KEY_ID` | when provider is `ses` | `` | |
| `SES_SECRET_ACCESS_KEY` | when provider is `ses` | `` | |
| `SES_REGION` | no | `us-east-1` | |
| `SES_FROM_EMAIL` | no | `noreply@bloomrealyou.com` | |
| `EMAIL_FROM` | no | `no-reply@example.com` | Legacy fallback. Prefer the provider-specific FROM vars. |

## Shipping

| Variable | Required | Default | Notes |
|---|---|---|---|
| `SHIPPING_PROVIDER` | no | `mock` | `mock` / `easypost` / `17track` / `shippo`. |
| `EASYPOST_API_KEY` | when provider is `easypost` | `` | |
| `SEVENTEENTRACK_API_KEY` | when provider is `17track` | `` | |
| `SHIPPO_API_KEY` | when provider is `shippo` | `` | |

## Auth / security

| Variable | Required | Default | Notes |
|---|---|---|---|
| `JWT_SECRET` | yes (prod) | `please-change-me-in-production` | Rotate quarterly. Min 32 bytes of entropy. |
| `JWT_EXPIRES_IN` | no | `7d` | Bearer token lifetime. |

## Observability

| Variable | Required | Default | Notes |
|---|---|---|---|
| `SENTRY_DSN` | no | `` | If set, the API + Next.js apps push errors to Sentry. |

## Verifying the configuration

```bash
# After bringing up the API
curl -fsS $API_URL/health | jq .
# Expect:  { "ok": true, ...}
```

If the API logs `Prisma sinks degrade to in-memory only`, `DATABASE_URL` is missing or unreachable. Same pattern for `notification provider: mock` (`NOTIFICATION_PROVIDER`) and `shipping provider: mock` (`SHIPPING_PROVIDER`).
