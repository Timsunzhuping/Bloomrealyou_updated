# Operations Runbook

Day-2 operational guidance for Bloomrealyou. Everything here is platform-agnostic — the same playbooks work on AWS, Render, Railway, or a Kubernetes cluster.

## 1. On-call rotation

| Shift | Hours (UTC) | Primary | Backup |
|---|---|---|---|
| Asia / EU | 00:00 – 12:00 | _fill in_ | _fill in_ |
| Americas | 12:00 – 24:00 | _fill in_ | _fill in_ |

Page via PagerDuty. SLA targets: respond within 15 min, mitigate within 1 h.

## 2. Health endpoints

| Service | URL | Expected |
|---|---|---|
| API | `GET /health` | `{ "ok": true, ... }` |
| Storefront | `GET /` | 200 with the home page |
| Admin | `GET /` | 302 → `/<locale>/login` (or `/dashboard` if cookied) |

## 3. Common runbooks

### 3.1 API returning 5xx

1. Check `/health` — if it's failing, the app process is up but a downstream is down.
2. Confirm Postgres is reachable: `psql $DATABASE_URL -c 'select 1'`.
3. Confirm Redis is reachable: `redis-cli -u $REDIS_URL ping`.
4. Tail the API logs and look for `Prisma sink failed` / `Notification dispatcher` warnings.
5. If Stripe webhooks are failing with 401, confirm the dashboard's webhook secret matches `STRIPE_WEBHOOK_SECRET`.

### 3.2 Webhooks getting rate-limited

The webhook controllers ship their own per-IP token bucket on top of the global guard. Symptoms: carrier reports 429s and `Retry-After` headers. Mitigations:

- Bump `WEBHOOK_RATE_LIMIT_BURST` and redeploy.
- Confirm the public IP the carrier uses; sometimes a single carrier collapses to one egress IP and exhausts the bucket.

### 3.3 Notifications not arriving

1. Visit the admin notification log: `GET /admin/notifications/logs?status=failed`.
2. Inspect `failureReason` — common causes:
   - SendGrid / SES credential misconfigured (`status=failed`, reason mentions 401).
   - DKIM / SPF not propagated yet (mail lands in spam — log status is `sent`).
3. To force a re-send, use the admin "send a test email" form on `/settings`. The result drops a fresh row into the log.

### 3.4 Postgres CPU spike

- Identify the slow query: `SELECT query, calls, total_exec_time FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 20`.
- 90% of the time it's an admin list page filtering by a column without an index. Add it via a Prisma migration.

### 3.5 Stripe webhook backlog

If Stripe shows pending events queued up:

1. Confirm the API is reachable from Stripe's IP ranges (firewall rules).
2. Check the idempotency store — if Redis is down, the in-memory fallback drops to per-instance dedup, which is fine but slower.
3. Replay manually from the Stripe dashboard once the API recovers; the controllers are idempotent on `event.id`.

## 4. Deploys

### Standard deploy (zero-downtime)

```bash
# 1. Apply pending migrations BEFORE rolling app images
pnpm db:migrate:deploy

# 2. Roll the API
docker compose -f docker-compose.prod.yml up -d --no-deps --build api
# Wait for /health to come back green.

# 3. Roll storefront + admin
docker compose -f docker-compose.prod.yml up -d --no-deps --build web admin
```

Prisma migrations are forward-only. If a migration is destructive (drop column, narrowing type), schedule a maintenance window and snapshot first.

### Emergency rollback

```bash
IMAGE_TAG=<previous-tag> docker compose -f docker-compose.prod.yml up -d <service>
```

If the rollback requires schema changes too, restore the pre-deploy Postgres snapshot.

## 5. Backups

| Asset | Frequency | Retention | Restore tested |
|---|---|---|---|
| Postgres | Daily snapshot + 5-min WAL | 7 days snapshot, 35 days PITR | Quarterly |
| Object storage | Continuous (versioning) | 90 days | Quarterly |
| Redis | Hourly (BullMQ + idempotency aren't critical) | 24 h | On-demand |

Backups are useless without a restore drill. Mark the drill date in the release checklist.

## 6. Capacity planning

Per 10k orders / month the platform comfortably runs on:

| Service | Replicas | Resource per replica |
|---|---|---|
| api | 2 | 0.5 vCPU / 512 MiB |
| web | 2 | 0.25 vCPU / 256 MiB |
| admin | 1 | 0.25 vCPU / 256 MiB |
| Postgres | 1 + read replica | 2 vCPU / 4 GiB |
| Redis | 1 | 0.25 vCPU / 256 MiB |

Storefront traffic is the wildcard — front it with a CDN and the apps barely move.

## 7. Secret rotation

| Secret | Rotation | Owner |
|---|---|---|
| `JWT_SECRET` | Quarterly | Eng |
| Stripe API keys | When Stripe rotates them or when an employee leaves | Finance + Eng |
| SendGrid / SES keys | Annually or on suspected compromise | Eng |
| MinIO / S3 credentials | Quarterly | Eng |

Rotation playbook: write the new value into the secret manager → roll the API service first (it's the only one reading the secrets) → invalidate the old value once `pnpm test:e2e` passes.

## 8. Compliance notes

- The platform stores payment data only as Stripe references — no PAN / CVV ever touches our servers.
- Customer PII is limited to email + shipping address. GDPR / CCPA delete-by-email queries hit the API at `DELETE /admin/account/<id>` (admin-only, audit logged).
- Notification logs retain customer email addresses; `notification_logs` rows older than 24 months should be archived to cold storage or deleted on a recurring job.
