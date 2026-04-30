# Release Checklist

Walk this list **before** flipping DNS / promoting an image to production. Items are grouped by surface; each one is a hard gate.

## 1. Code health

- [ ] `pnpm lint` passes locally and in CI.
- [ ] `pnpm typecheck` passes locally and in CI.
- [ ] `pnpm test` passes locally and in CI.
- [ ] `pnpm build` produces clean output for `apps/web`, `apps/admin`, `apps/api`, and every package.
- [ ] `pnpm test:e2e` runs green against a freshly-booted local stack.
- [ ] `git status` is clean — no committed `.env` files or stray secrets.

## 2. Storefront

- [ ] `/en` loads.
- [ ] `/zh-CN` loads.
- [ ] `/es` loads.
- [ ] `/ar` loads with `<html dir="rtl">`.
- [ ] Product category pages list at least one product.
- [ ] Product detail page surfaces a `Customize` CTA.
- [ ] Customizer mounts the canvas and accepts a text element.
- [ ] Adding a customised item to the cart updates the cart icon count.
- [ ] Cart page renders the line item with correct total.
- [ ] Checkout page accepts a Stripe **test** card and produces an order success screen.
- [ ] Order confirmation email arrives in the test inbox (`order.confirmation` template).

## 3. Admin

- [ ] Login form rejects bad credentials and writes a `login_failed` audit row.
- [ ] Login with the seeded admin lands on `/dashboard`.
- [ ] Orders list renders and supports search.
- [ ] Order detail page shows the design files for customised line items.
- [ ] Approve a design → `order.design_approved` email is enqueued and the order transitions out of `design_review`.
- [ ] Request a revision → `order.design_revision_required` email is enqueued.
- [ ] Production page allows creating a job and assigning a supplier.
- [ ] Updating production status writes an audit row with `actorRole` set.
- [ ] Shipments page allows recording a tracking number; tracking link opens carrier site.
- [ ] Settings page (`/settings`) sends a test email through the active provider.
- [ ] Notification logs (`/admin/notifications/logs` API) shows the test send.

## 4. RFQ

- [ ] Corporate gifts page renders.
- [ ] RFQ form submits successfully with a logo upload (`png` / `jpg` / `pdf`).
- [ ] RFQ appears in the admin RFQ list.
- [ ] Drafting a quote and marking it `sent` enqueues the `quote.ready` email.
- [ ] Customer can convert the quote to an order.

## 5. Notifications & email

- [ ] `NOTIFICATION_PROVIDER` is set to a real provider (sendgrid / ses) — **NOT** `mock`.
- [ ] DKIM / SPF records are published on the sending domain.
- [ ] At least one welcome / order-confirmation email lands in the inbox (not spam) for each of: Gmail, Outlook, Yahoo.
- [ ] Notification log rows show `status=sent` with a non-null `providerMessageId`.

## 6. Payments

- [ ] Stripe **live** API key is set (`STRIPE_SECRET_KEY` starts with `sk_live_`).
- [ ] Stripe webhook endpoint is configured at `https://api.example.com/payments/webhook/stripe` for `payment_intent.succeeded` and `payment_intent.payment_failed`.
- [ ] `STRIPE_WEBHOOK_SECRET` matches the dashboard.
- [ ] `STRIPE_WEBHOOK_REQUIRE_SIGNATURE=true` in the production environment.
- [ ] A real $0.50 test order completes end-to-end and the funds appear in the Stripe dashboard.
- [ ] PayPal credentials (`PAYPAL_*`) are populated **or** the PayPal option is hidden in the UI.

## 7. Infrastructure

- [ ] Postgres migration `prisma migrate deploy` ran cleanly with no pending diffs.
- [ ] Object storage bucket exists and the IAM policy permits the API role to `PutObject` / `GetObject`.
- [ ] Redis is reachable from every API replica; `IDEMPOTENCY_STORE_BACKEND=redis` is set if running > 1 instance.
- [ ] CDN serves the storefront with HSTS, a valid TLS cert, and gzip + brotli enabled.
- [ ] CORS allow-list (`API_CORS_ORIGINS`) lists only the production storefront / admin domains.
- [ ] `JWT_SECRET` is at least 32 bytes from `openssl rand -hex 32` and rotated quarterly.

## 8. Observability

- [ ] `SENTRY_DSN` (or your preferred error tracker) is configured for all three apps.
- [ ] Application logs flow into a centralised store (CloudWatch / Loki / Datadog).
- [ ] Alerts exist for: API 5xx rate > 1%, Stripe webhook failure, payment_failed > 5/min, p95 API latency > 1s.
- [ ] Uptime monitor pings `GET /health` every 60s on the API and storefront / admin home pages.

## 9. Backups & disaster recovery

- [ ] Postgres automated daily snapshots are enabled with ≥ 7-day retention.
- [ ] Manual snapshot taken **right before** the deploy.
- [ ] Object storage has versioning + replication enabled (or a documented justification for not).
- [ ] Restore drill done in the last quarter — a snapshot was successfully imported into a scratch instance.

## 10. Documentation

- [ ] [Deployment guide](deployment.md) reflects any infrastructure changes shipped this release.
- [ ] [Operations runbook](operations.md) lists the on-call rotation and escalation contacts.
- [ ] Release notes drafted and shared with the support / sales teams.

## Sign-off

| Role | Name | Date |
|---|---|---|
| Engineering | | |
| Product | | |
| Operations | | |

A release is shippable only when **every box is checked** and the table above carries three signatures.
