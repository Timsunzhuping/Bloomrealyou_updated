# Deploy to Alibaba Cloud (ECS + Docker Compose)

Runbook for an overseas/global deployment on Alibaba Cloud, **no ICP filing
required** (Hong Kong / Singapore region), with managed RDS + Redis + OSS and
Stripe + PayPal payments.

| Layer | Service | Notes |
|---|---|---|
| Compute | **ECS** (Ubuntu 22.04, 2 vCPU / 4 GB+) | Runs api + web + admin + nginx via Docker Compose |
| Database | **RDS PostgreSQL 16** | Managed, automated backups |
| Cache / queue | **Redis (Tair)** | Idempotency + BullMQ notifications |
| Object storage | **OSS** (durable) or in-stack **MinIO** (fast start) | Design previews, uploads |
| Edge | **EIP + (optional) SLB + CDN** | TLS terminates at nginx |
| DNS / TLS | Alibaba Cloud DNS + Let's Encrypt | No ICP needed in HK/SG |

> **Why no ICP?** ICP filing is only mandatory when serving from a *mainland
> China* region (Hangzhou/Beijing/Shanghai/...). Hong Kong and Singapore
> regions are exempt, which is why we picked them for a global-first launch.

---

## 0. Prerequisites
- An Alibaba Cloud account with real-name verification and a payment method.
- A registered domain you control (e.g. `bloomrealyou.com`).
- Local: `ssh`, and the repo pushed to GitHub.
- Stripe + PayPal accounts with API keys (test keys first, live keys at launch).

---

## 1. Network + ECS

1. **VPC**: console → *Virtual Private Cloud* → create a VPC + vSwitch in your
   chosen region (e.g. `cn-hongkong` or `ap-southeast-1` Singapore).
2. **ECS**: *Elastic Compute Service* → create instance:
   - Image: **Ubuntu 22.04 64-bit**
   - Type: 2 vCPU / 4 GB (e.g. `ecs.g7.large`) — bump to 8 GB if builds are slow.
   - Storage: 40 GB+ ESSD.
   - Public IP: assign an **EIP** (Elastic IP).
   - Security group inbound: allow **22** (SSH, your IP only), **80**, **443**.
3. SSH in and install Docker:
   ```bash
   ssh root@<EIP>
   curl -fsSL https://get.docker.com | sh
   # Docker Compose v2 ships with the engine; verify:
   docker compose version
   ```

---

## 2. RDS PostgreSQL

1. Console → *ApsaraDB RDS* → create instance:
   - Engine: **PostgreSQL 16**, same region/VPC as the ECS.
   - Spec: 1–2 core / 2–4 GB to start.
2. After it boots:
   - Create a database `bloomrealyou` and an account (user + password).
   - **Whitelist** the ECS private IP (RDS → Data Security → whitelist).
   - Copy the **internal** (VPC) endpoint — use it in `DATABASE_URL`.
3. Connection string (use the VPC-internal host, not public):
   ```
   postgresql://<user>:<pass>@<rds-internal-host>:5432/bloomrealyou?schema=public
   ```

---

## 3. Redis (Tair)

1. Console → *ApsaraDB for Redis / Tair* → create a Community-edition instance
   in the same VPC.
2. Set a password, whitelist the ECS private IP.
3. Connection string:
   ```
   redis://:<password>@<redis-internal-host>:6379
   ```

> Staging shortcut: skip RDS/Redis and run `postgres:16` + `redis:7` inside the
> compose stack (volumes on the ECS disk). Fine to validate infra; **not** for
> real launch data.

---

## 4. OSS (object storage)

OSS is **not** natively S3-API compatible, and the current code uses the S3
SDK. Two options:

- **Launch-now (zero code):** run **MinIO** inside the compose stack (already in
  `docker-compose.prod.example.yml`). Back up the `minio-data` volume.
- **Durable (recommended for production):** create an **OSS bucket** + a RAM
  user with an access key, and add an OSS storage adapter (tracked in
  `docs/roadmap-to-launch.md` Phase 4). Until then, keep MinIO.

For MinIO-in-stack you only need to choose `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY`.

---

## 5. Configure the stack

On the ECS:

```bash
git clone https://github.com/timsunzhuping/bloomrealyou_updated.git
cd bloomrealyou_updated
git checkout claude/ai-custom-merchandise-platform-uD8F4
cp docker-compose.prod.example.yml docker-compose.prod.yml
cp .env.production.aliyun.example .env.production   # template added by this repo
```

Edit `.env.production` and fill (see the template for the full annotated list):

```bash
# --- core ---
POSTGRES_USER=...                 # only if running Postgres in-stack
POSTGRES_PASSWORD=...
POSTGRES_DB=bloomrealyou
# If using managed RDS instead, set DATABASE_URL directly in the compose `api` env.

JWT_SECRET=<openssl rand -hex 32>
IMAGE_TAG=latest

# --- public URLs (your domain) ---
API_URL=https://api.bloomrealyou.com
API_CORS_ORIGINS=https://bloomrealyou.com,https://admin.bloomrealyou.com
NEXT_PUBLIC_DEFAULT_LOCALE=en

# --- storage (MinIO in-stack) ---
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
MINIO_BUCKET=bloomrealyou-uploads

# --- payments ---
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...

# --- optional real providers (else mock) ---
AI_PROVIDER=openai
OPENAI_API_KEY=...
NOTIFICATION_PROVIDER=sendgrid
SENDGRID_API_KEY=...
SHIPPING_PROVIDER=easypost
EASYPOST_API_KEY=...
```

> If you use managed **RDS / Redis**, point the `api` service's `DATABASE_URL`
> and `REDIS_URL` / `BULLMQ_REDIS_URL` at the VPC-internal endpoints and remove
> the in-stack `postgres` / `redis` services from `docker-compose.prod.yml`.

---

## 6. Build, migrate, seed, launch

```bash
# Build images (first build ~8–12 min on a 2 vCPU box).
docker compose -f docker-compose.prod.yml build

# Start infra + apps.
docker compose -f docker-compose.prod.yml up -d

# Run migrations against the configured DB.
docker compose -f docker-compose.prod.yml run --rm api \
  node node_modules/prisma/build/index.js migrate deploy

# (Optional) seed demo catalog + admin users.
docker compose -f docker-compose.prod.yml run --rm api \
  pnpm --filter @custom-merch/db db:seed
```

---

## 7. TLS + reverse proxy (nginx)

Point three subdomains at the ECS EIP (Alibaba Cloud DNS → A records):
- `bloomrealyou.com` → web (3000)
- `admin.bloomrealyou.com` → admin (3001)
- `api.bloomrealyou.com` → api (4000)

Terminate TLS at nginx on the host and proxy to the compose ports. Quickest is
`nginx-proxy` + `acme-companion`, or a hand-written nginx config with Certbot:

```bash
apt-get install -y certbot
certbot certonly --standalone -d bloomrealyou.com -d admin.bloomrealyou.com -d api.bloomrealyou.com
```

Then an nginx server block per subdomain proxying to `127.0.0.1:3000/3001/4000`
with the Let's Encrypt cert. (A ready-made `deploy/nginx/` config can be added
on request.)

---

## 8. Smoke test

```bash
curl -s https://api.bloomrealyou.com/health
# {"status":"ok",...}

curl -s -X POST https://api.bloomrealyou.com/admin/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@bloomrealyou.com","password":"admin123"}'
# {"token":"at_...","user":{...}}
```

Open `https://bloomrealyou.com` (storefront) and `https://admin.bloomrealyou.com`
(admin). Change the seeded admin passwords immediately.

---

## 9. Stripe + PayPal webhooks

- Stripe dashboard → Developers → Webhooks → add
  `https://api.bloomrealyou.com/payments/webhook/stripe`, copy the signing
  secret into `STRIPE_WEBHOOK_SECRET`, redeploy.
- PayPal: configure the webhook once the PayPal provider is implemented
  (roadmap Phase 2).

---

## 10. Operations

- **Logs:** `docker compose -f docker-compose.prod.yml logs -f api`
- **Update:** `git pull && docker compose -f docker-compose.prod.yml build && docker compose -f docker-compose.prod.yml up -d`
- **Backups:** enable RDS automated backups; if using in-stack Postgres/MinIO,
  snapshot the ECS disk + the named volumes on a schedule.

> ⚠️ Before relying on this for real orders, complete **Phase 1 (persistence
> hardening)** in `docs/roadmap-to-launch.md` — today the core commerce
> repositories are in-memory and lose data on restart.
