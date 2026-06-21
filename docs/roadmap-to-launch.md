# Roadmap to Production Launch (Alibaba Cloud)

> Audience: engineering. This is the execution plan to take Bloomrealyou from
> its current "feature-complete prototype" state to a real, money-handling
> production launch on Alibaba Cloud.
>
> Decisions locked in (2026-06-21):
> - **Target market:** overseas / global first → Alibaba Cloud **Hong Kong** or
>   **Singapore** region, **no ICP filing required**.
> - **Deploy topology:** single **ECS + Docker Compose**, with managed **RDS
>   PostgreSQL** + **Redis (Tair)** + **OSS / in-stack MinIO** for storage.
> - **Payments:** **Stripe + PayPal** (keep the existing adapters; finish PayPal).

---

## 0. Where the codebase actually is

A deep audit (2026-06-21) found the platform is **much more built-out than the
README suggests**, but with one structural gap that gates a real launch.

### Strong (production-grade or close)
| Area | State |
|---|---|
| API surface | 27 NestJS modules; all major domains have real business logic |
| Domain model | 33 Prisma models + 4 migrations — comprehensive and already written |
| Frontend | `apps/web` (28 pages) + `apps/admin` (28 pages), i18n (en/zh-CN/es/ar, RTL), Konva customizer, shadcn/ui |
| Provider adapters | Stripe (real), OpenAI + Doubao (real), SendGrid/SES (real), EasyPost/Shippo/17Track (real), S3/MinIO (real) — each with a mock fallback |
| Deploy scaffolding | `docker-compose.prod.example.yml`, per-app Dockerfiles, Prisma migrations all exist |

### The critical gap — **data does not persist**
The core commerce repositories are **in-memory `Map`s**, not database-backed.
They are lost on every restart / redeploy and cannot be shared across instances.

| Repository | Persists today? | Launch risk |
|---|---|---|
| `orders/orders.repository.ts` | ❌ in-memory only | **Blocker** — orders vanish on restart |
| `payments/payments.repository.ts` | ❌ in-memory only | **Blocker** — financial records lost |
| `account/account.repository.ts` | ❌ in-memory only | **Blocker** — customer accounts/addresses lost |
| `cart/cart.repository.ts` | ❌ in-memory only | High — active carts lost |
| `customizations/customizations.repository.ts` | ❌ in-memory only | High — customer designs (their IP) lost |
| `quotes/` + `rfqs/` | ❌ in-memory only | High — B2B pipeline lost |
| `admin-products / admin-orders / admin-templates` | ❌ in-memory only | Medium — back-office edits lost |
| `admin-auth/admin-users.repository.ts` | ❌ in-memory + hardcoded seeds | Medium — sessions drop on restart; HMAC password hash |
| audit-logs / shipments / production / suppliers / notifications | ✅ Prisma dual-write | OK (pattern to copy) |

> The good news: the **target schema already exists** (33 models). The work is
> wiring the repository layer to it — and there is already a proven pattern to
> copy (`_lib/prisma-sink.ts` + the `*.prisma-sink.ts` files), which we will
> upgrade from "fire-and-forget" to "DB is the source of truth" for the
> money-handling entities.

---

## Phase plan

Estimates assume one focused engineer. Phases 0 and 1 can run in parallel.

### Phase 0 — Alibaba Cloud infra stand-up (staging) · ~1–2 days
Goal: prove the box, DB, network, and TLS — deploy the *current* build as a
throwaway **staging** environment. See `docs/deploy-alibaba-cloud.md` for the
click-by-click runbook. Summary:
- [ ] ECS instance (HK or SG region), Ubuntu 22.04, 2 vCPU / 4 GB min.
- [ ] RDS PostgreSQL 16 (or run Postgres in-stack for staging only).
- [ ] Redis (Tair) — or in-stack `redis:7` for staging.
- [ ] OSS bucket + RAM user — or in-stack MinIO for staging.
- [ ] Domain + DNS A record → ECS EIP; TLS via nginx + Let's Encrypt.
- [ ] `docker compose -f docker-compose.prod.yml up -d`, run `prisma migrate deploy` + seed.
- [ ] Smoke test `/health`, storefront, admin login.

**Exit:** a live HTTPS staging URL. (Data still ephemeral — that's fine here.)

### Phase 1 — Persistence hardening (the core epic) · ~1.5–2 weeks
Convert the in-memory commerce repositories to Prisma-backed, **DB as source of
truth** (prime-on-boot + write-through). Order by business risk:
1. [ ] **Orders** — write-through + read from DB; backfill `OrderItem` snapshots.
2. [ ] **Payments** — write-through; reconcile with `Payment` model + webhook events.
3. [ ] **Accounts + addresses** — `User` / address tables.
4. [ ] **Carts** — Prisma (or Redis with TTL) so checkout survives restarts.
5. [ ] **Customizations / designs** — `CustomerDesign` + preview URLs in OSS.
6. [ ] **Quotes + RFQs** — `RFQ` / `Quote` tables; keep audit trail.
7. [ ] **Admin products / orders / templates** — persist back-office edits.
8. [ ] **Admin users + sessions** — move users to a DB table; sessions to Redis with expiry.
9. [ ] Integration tests per repository against a real Postgres (testcontainers or a CI service DB).

**Exit:** kill the API container, bring it back, and every order / payment /
customer / design is still there. This is the true launch gate.

### Phase 2 — Payments productionization · ~3–5 days
- [ ] Stripe: real keys, enable `STRIPE_WEBHOOK_REQUIRE_SIGNATURE=true`, register webhook endpoint, test charge → webhook → order `paid` → fulfillment.
- [ ] PayPal: implement the **stubbed** provider (Orders API: create + capture + webhook). User selected PayPal.
- [ ] Redis-backed webhook idempotency (already supported via `IDEMPOTENCY_STORE_BACKEND=redis`).
- [ ] Refund / partial-refund path verified end-to-end.

### Phase 3 — Security & auth hardening · ~3–5 days
- [ ] Admin password hashing → Argon2id/bcrypt (currently HMAC-SHA256).
- [ ] Rotate `JWT_SECRET`; move all secrets to ECS env / secret store (never committed).
- [ ] Lock `API_CORS_ORIGINS` to the real storefront + admin domains.
- [ ] Decide customer auth model: keep anonymous session + email, or add real customer login/registration (product call — flagged).
- [ ] Security headers, HTTPS enforcement, rate-limit review (`API_RATE_LIMIT_*`).

### Phase 4 — Observability, reliability, ops · ~3–5 days
- [ ] Upgrade `/health` to probe DB + Redis (currently uptime-only) for SLB health checks.
- [ ] Sentry error tracking (`SENTRY_DSN` already supported) + structured logs.
- [ ] RDS automated backups + a tested restore drill.
- [ ] Storage: migrate staging MinIO → **OSS** for durability (S3-compatible adapter or an OSS adapter — note OSS is *not* natively S3-API compatible; running MinIO on ECS is the zero-code path, OSS is the durable path).
- [ ] Zero-downtime redeploy approach (image tag + `docker compose up -d` rolling, or two ECS behind SLB).

### Phase 5 — QA, content, compliance · ~1 week
- [ ] E2E smoke tests (`tests/e2e`) on the money path: browse → customize → cart → checkout → pay → order → admin → production → shipment.
- [ ] Replace placeholders: admin dashboard charts (wire real data), web profile page, error pages.
- [ ] Real catalog content + product images in OSS (today: `placehold.co` stubs).
- [ ] Legal pages: terms, privacy, returns; cookie consent.
- [ ] SEO: sitemap, robots, hreflang (i18n already emits alternates), OG images.

### Phase 6 — Production launch · ~2–3 days
- [ ] Separate **production** environment (own RDS/Redis/OSS, live payment keys, prod domain).
- [ ] Full smoke test on prod with a real low-value transaction + refund.
- [ ] Monitoring alerts wired (uptime, error rate, payment failures).
- [ ] Go-live checklist sign-off.

---

## Timeline

| Track | Duration |
|---|---|
| **Soft launch / beta** (Phases 0–2 + minimal 3/4) | **~2–3 weeks** |
| **Full production launch** (all phases) | **~4–6 weeks** |

Phases 0 (deploy) and 1 (persistence) start immediately and in parallel.

---

## Immediate next actions
1. Stand up the Alibaba Cloud staging box (Phase 0) — runbook in `docs/deploy-alibaba-cloud.md`.
2. Begin Phase 1 with **Orders + Payments** persistence (highest risk first).
