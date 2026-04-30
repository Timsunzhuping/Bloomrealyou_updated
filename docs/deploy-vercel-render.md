# Deploy to Vercel + Render (zero-cost MVP)

Step-by-step recipe for a free-tier deployment:

| Service | Host | Why |
|---|---|---|
| `apps/web` (storefront) | Vercel | First-class Next.js host, free TLS, instant rollbacks |
| `apps/admin` (back-office) | Vercel | Same as above |
| `apps/api` (NestJS) | Render Web Service (Docker, free tier) | Auto-binds Postgres, accepts our Dockerfile |
| Postgres | Render Postgres (free tier) | 1 GB / 90-day retention — fine for an MVP |
| Redis / Object storage | _omitted_ | The platform falls back to in-memory + the mock storage; both are MVP-safe |
| Stripe / SendGrid / SES | _optional_ | Defaults to mock providers — emails land in Render logs |

End state: storefront on `https://bloomrealyou-web.vercel.app`, admin on `https://bloomrealyou-admin.vercel.app`, API on `https://bloomrealyou-api.onrender.com`. (Names are illustrative — Vercel / Render assign the actual subdomains.)

## 0. Prerequisites

- A GitHub account with this repo pushed.
- A free Render account (GitHub OAuth login is fine).
- A free Vercel account (GitHub OAuth login is fine).

## 1. Render — apply the Blueprint

The repo ships `render.yaml` at the root. Render reads it and creates everything for you.

1. Sign in at <https://dashboard.render.com>.
2. Click **New** → **Blueprint**.
3. Connect this GitHub repo. Render parses `render.yaml` and shows two resources:
   - `bloomrealyou-postgres` (Postgres database, free)
   - `bloomrealyou-api` (Web Service, Docker, free)
4. Click **Apply**. Wait ~5 min for the first build (Docker layers cache after that).
5. Once the API status is **Live**, copy its public URL — it looks like `https://bloomrealyou-api.onrender.com`.
6. Open the API service → **Environment** → fill in:
   - `STRIPE_SECRET_KEY` (optional; leave blank for the mock path)
   - `STRIPE_WEBHOOK_SECRET` (optional)
   - `API_CORS_ORIGINS` — leave blank for now; we'll come back after Vercel.
7. Click **Save Changes** — Render auto-redeploys.

> **Note on free tier:** the API sleeps after 15 min of inactivity. The first request after sleep takes ~30 s while the container cold-starts. That's normal. Upgrade to the $7/mo tier to keep it warm.

### Run the database migration

The first Render deploy starts the API but doesn't run migrations automatically. From the API service page click **Shell** and run:

```bash
node node_modules/prisma/build/index.js migrate deploy
```

If `Database is up to date` is the only message, you're done. Subsequent deploys re-apply migrations on boot only if you wire that into the start command (intentionally not the default — we keep schema changes explicit).

## 2. Vercel — deploy the storefront

1. Sign in at <https://vercel.com>.
2. **Add New** → **Project** → import this GitHub repo.
3. Vercel asks where the app lives. Pick:
   - **Project Name:** `bloomrealyou-web`
   - **Root Directory:** `apps/web`
   - **Framework Preset:** Next.js (auto-detected)
4. Build settings — Vercel reads `apps/web/vercel.json`, so leave the form alone. The file already says:
   - Install Command: `cd ../.. && pnpm install --frozen-lockfile`
   - Build Command: `cd ../.. && pnpm --filter @custom-merch/web... build`
5. **Environment Variables** — add:
   - `NEXT_PUBLIC_API_BASE_URL` = `https://bloomrealyou-api.onrender.com` (the URL from step 1.5)
   - `NEXT_PUBLIC_DEFAULT_LOCALE` = `en`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = (optional; leave blank if you skipped Stripe)
6. Click **Deploy**. First build takes 3–5 min.
7. Vercel hands you `https://bloomrealyou-web-<hash>.vercel.app`. Open it — you should see the home page.

## 3. Vercel — deploy the admin console

Repeat step 2 with these differences:

- **Project Name:** `bloomrealyou-admin`
- **Root Directory:** `apps/admin`
- **Environment Variables:**
  - `NEXT_PUBLIC_ADMIN_API_BASE_URL` = `https://bloomrealyou-api.onrender.com`

After deploy, sign in with the seeded admin account:

| Email | Password |
|---|---|
| `admin@bloomrealyou.com` | `admin123` |
| `sales@bloomrealyou.com` | `sales123` |
| `designer@bloomrealyou.com` | `designer123` |
| `pm@bloomrealyou.com` | `pm123` |
| `finance@bloomrealyou.com` | `finance123` |
| `supplier@bloomrealyou.com` | `supplier123` |

Change these the moment the demo is over — they live in `apps/api/src/admin-auth/admin-users.repository.ts` and ship with every build.

## 4. Wire CORS on the API

Now that you know the Vercel URLs, go back to the Render API service:

1. **Environment** tab.
2. `API_CORS_ORIGINS` = `https://bloomrealyou-web-<hash>.vercel.app,https://bloomrealyou-admin-<hash>.vercel.app` (no trailing slashes; comma-separated).
3. **Save Changes** → Render redeploys.

Until you do this, the storefront / admin will hit the API but the browser will refuse the response with a CORS error. The Vercel "Production" URL is also a safe value to add (it doesn't change between deploys).

## 5. Smoke test

From a terminal that can reach the public internet:

```bash
# 1. API up?
curl -s https://bloomrealyou-api.onrender.com/health

# Expected:  {"ok":true,"prisma":"unavailable",...}
# `prisma:unavailable` is fine if you skipped step 1's `migrate deploy`. Run
# it now if you want the relational store online.

# 2. Storefront up?
curl -sI https://bloomrealyou-web.vercel.app | head -5

# 3. Admin login works?
curl -s -X POST https://bloomrealyou-api.onrender.com/admin/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@bloomrealyou.com","password":"admin123"}'
```

The third call should return `{ "token": "...", "user": { ... } }`. If it doesn't, check Render logs for the matching `audit_logs` line — `login_failed` rows record the IP.

## 6. Optional: real providers

| Capability | How to enable |
|---|---|
| Real email | On Render, set `NOTIFICATION_PROVIDER=sendgrid` + `SENDGRID_API_KEY=...` and redeploy. |
| Real shipping | `SHIPPING_PROVIDER=easypost` + `EASYPOST_API_KEY=...`. |
| Real AI | `AI_PROVIDER=openai` + `OPENAI_API_KEY=...`. |
| Multi-instance Redis | Upgrade Render to a paid plan, add a Redis service, then set `IDEMPOTENCY_STORE_BACKEND=redis` + `NOTIFICATIONS_QUEUE_DRIVER=bullmq` + `BULLMQ_REDIS_URL=...`. |
| Stripe webhooks | Add `https://bloomrealyou-api.onrender.com/payments/webhook/stripe` to the Stripe dashboard, copy the signing secret into `STRIPE_WEBHOOK_SECRET`, set `STRIPE_WEBHOOK_REQUIRE_SIGNATURE=true`. |

Each switch is independent — the platform falls back to mock when a credential is missing, so partial configurations don't crash the API.

## 7. Tear down

- Render: each resource has a **Delete** button at the bottom of its settings page.
- Vercel: project settings → **Advanced** → **Delete Project**. Vercel keeps the URL reserved for a few days; if you redeploy with the same project name you'll get the same hostname back.

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Vercel build fails on `pnpm: not found` | Older Vercel runtime | Set `ENABLE_EXPERIMENTAL_COREPACK=1` in project env vars |
| Vercel build fails on `Cannot find module '@custom-merch/...'` | `Root Directory` is wrong, install/build commands didn't run from repo root | Re-check that `apps/web/vercel.json` (or admin) is committed and Vercel UI picked it up |
| Render API `502 Bad Gateway` | Container didn't bind to `$PORT` | We listen on `process.env.PORT` automatically — confirm the build deployed the latest `apps/api/src/main.ts` |
| Storefront shows but every API call is CORS-blocked | `API_CORS_ORIGINS` not set | Step 4 |
| Admin login returns 401 with valid creds | The seeded users only exist after the API boots — Render free tier sleeps; first request after 15 min of idle returns 502 / 401 from the bootstrap window. Just retry. |
| Customizer page is blank | Render API is cold-starting; the storefront fetched product data and got nothing back | Reload after ~30 s |
