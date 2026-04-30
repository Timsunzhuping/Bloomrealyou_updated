# Deploy to Google Cloud Run + Neon (zero-cost MVP)

End state:
- API (NestJS): `https://bloomrealyou-api-<hash>-uc.a.run.app` on Cloud Run
- Database: Neon free-tier PostgreSQL (3 GB, no expiry)
- Storefront / admin: Vercel (unchanged)

| Service | Host | Cost |
|---|---|---|
| `apps/api` | Google Cloud Run | Free tier: 2M requests, 360k vCPU-sec / month |
| Postgres | Neon.tech | Free tier: 3 GB, 1 always-on branch |
| `apps/web` / `apps/admin` | Vercel | Free |
| Redis / object storage | _omitted_ | In-memory + mock fallback (MVP-safe) |

## 0. Prerequisites

- GCP account with billing enabled (new accounts get $300 free credit).
- `gcloud` CLI installed: <https://cloud.google.com/sdk/docs/install>
- Logged in: `gcloud auth login`
- A Neon account (free): <https://neon.tech> (sign in with GitHub).

## 1. Neon — create the database

1. Open <https://console.neon.tech> → **New Project**.
2. Project name: `bloomrealyou`. Region: pick the one closest to your Cloud Run region (e.g. `AWS US East` if you'll deploy to `us-central1`).
3. Postgres version: 16 (default). Click **Create project**.
4. Neon shows the connection string — copy the **Pooled connection** value. It looks like:
   ```
   postgresql://user:pass@ep-xxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
5. Save this string — you'll paste it into Cloud Run as `DATABASE_URL`.

## 2. GCP — bootstrap the project

Pick a project ID (lowercase, dashes only) and a region. The commands below assume `bloomrealyou-prod` and `asia-east1` — change to taste.

```bash
# Set defaults so you don't have to repeat --project / --region.
export PROJECT_ID=bloomrealyou-prod
export REGION=asia-east1

gcloud projects create $PROJECT_ID --name="Bloomrealyou"
gcloud config set project $PROJECT_ID
gcloud config set run/region $REGION

# Link billing (replace BILLING_ACCOUNT_ID with the value from
# `gcloud billing accounts list`).
gcloud billing projects link $PROJECT_ID \
  --billing-account=BILLING_ACCOUNT_ID

# Enable the APIs Cloud Build + Cloud Run + Artifact Registry need.
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com
```

## 3. Artifact Registry — create the image repo

Cloud Build pushes the API image here, then Cloud Run pulls it.

```bash
gcloud artifacts repositories create bloomrealyou \
  --repository-format=docker \
  --location=$REGION \
  --description="Bloomrealyou container images"
```

## 4. Secret Manager — store DATABASE_URL and JWT_SECRET

Don't paste these as plain env vars; bind them as secrets so they're encrypted at rest and never appear in build logs.

```bash
# Paste the Neon pooled connection string when prompted.
printf "%s" "postgresql://user:pass@ep-xxx-pooler.../neondb?sslmode=require" \
  | gcloud secrets create DATABASE_URL --data-file=-

# Generate a 64-byte random JWT secret.
openssl rand -hex 32 \
  | tr -d '\n' \
  | gcloud secrets create JWT_SECRET --data-file=-

# Allow the Cloud Run runtime service account to read both secrets.
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

for s in DATABASE_URL JWT_SECRET; do
  gcloud secrets add-iam-policy-binding $s \
    --member="serviceAccount:${RUNTIME_SA}" \
    --role="roles/secretmanager.secretAccessor"
done
```

## 5. Build + deploy via Cloud Build

The repo ships `cloudbuild.yaml` at the root. It builds `apps/api/Dockerfile`, pushes to Artifact Registry, then deploys to Cloud Run in one shot.

```bash
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=_REGION=${REGION},_REPO=bloomrealyou
```

First build takes ~6–8 minutes (Docker layers cache after that). On success the last line shows the Cloud Run URL — copy it.

## 6. Wire env + secrets onto the Cloud Run service

The `cloudbuild.yaml` deploy step doesn't include environment variables (we set them once, separately, so re-deploys don't clobber operator changes).

```bash
gcloud run services update bloomrealyou-api \
  --region=$REGION \
  --update-secrets=DATABASE_URL=DATABASE_URL:latest,JWT_SECRET=JWT_SECRET:latest \
  --update-env-vars=\
NODE_ENV=production,\
API_HOST=0.0.0.0,\
API_CORS_ORIGINS=*,\
IDEMPOTENCY_STORE_BACKEND=memory,\
NOTIFICATIONS_QUEUE_DRIVER=memory,\
NOTIFICATION_PROVIDER=mock,\
SHIPPING_PROVIDER=mock,\
AI_PROVIDER=mock
```

> `API_CORS_ORIGINS=*` is a temporary catch-all. Tighten it after Vercel is live (step 8).

Verify the service picked up the new revision:

```bash
gcloud run services describe bloomrealyou-api \
  --region=$REGION \
  --format='value(status.url)'
```

## 7. Run the database migration

Prisma migrations run from your laptop against the Neon database — Cloud Run never needs migrate permissions.

```bash
# Use the same Neon URL you stored in Secret Manager.
export DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.../neondb?sslmode=require"

cd apps/api
pnpm install --frozen-lockfile   # first time only
pnpm prisma migrate deploy
pnpm prisma db seed              # optional — seeds demo products + admin users
```

Expected output ends with `Database is up to date.`

## 8. Vercel — point storefront + admin at Cloud Run

In each Vercel project (`bloomrealyou-web` and `bloomrealyou-admin`), update env vars to the Cloud Run URL from step 5:

| Project | Variable | Value |
|---|---|---|
| web | `NEXT_PUBLIC_API_BASE_URL` | `https://bloomrealyou-api-<hash>-uc.a.run.app` |
| admin | `NEXT_PUBLIC_ADMIN_API_BASE_URL` | `https://bloomrealyou-api-<hash>-uc.a.run.app` |

Trigger a redeploy (Vercel → project → Deployments → ⋯ → **Redeploy**). `NEXT_PUBLIC_*` values are baked at build time, so the redeploy is mandatory.

Once Vercel is live, tighten CORS:

```bash
gcloud run services update bloomrealyou-api \
  --region=$REGION \
  --update-env-vars=API_CORS_ORIGINS=https://bloomrealyou-web.vercel.app,https://bloomrealyou-admin.vercel.app
```

## 9. Smoke test

```bash
API=$(gcloud run services describe bloomrealyou-api --region=$REGION --format='value(status.url)')

# Health
curl -s "$API/health"
# Expected: {"ok":true,...}

# Admin login (the seeded user)
curl -s -X POST "$API/admin/auth/login" \
  -H 'content-type: application/json' \
  -d '{"email":"admin@bloomrealyou.com","password":"admin123"}'
# Expected: {"token":"...","user":{...}}
```

## 10. Optional: real providers

Same matrix as the Render guide — set the variables on the Cloud Run service:

```bash
gcloud run services update bloomrealyou-api --region=$REGION \
  --update-env-vars=NOTIFICATION_PROVIDER=sendgrid \
  --update-secrets=SENDGRID_API_KEY=SENDGRID_API_KEY:latest
```

| Capability | Variables |
|---|---|
| Email | `NOTIFICATION_PROVIDER=sendgrid` + `SENDGRID_API_KEY` |
| Shipping | `SHIPPING_PROVIDER=easypost` + `EASYPOST_API_KEY` |
| AI | `AI_PROVIDER=openai` + `OPENAI_API_KEY` |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_WEBHOOK_REQUIRE_SIGNATURE=true` |

Store every credential in Secret Manager (`gcloud secrets create …`) and reference with `--update-secrets`, never `--update-env-vars`.

## 11. Tear down

```bash
gcloud run services delete bloomrealyou-api --region=$REGION
gcloud artifacts repositories delete bloomrealyou --location=$REGION
# Drop the Neon project from console.neon.tech.
```

## 12. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `gcloud builds submit` fails on `permission denied` to Artifact Registry | Cloud Build SA lacks the writer role | `gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')@cloudbuild.gserviceaccount.com" --role=roles/artifactregistry.writer` |
| Cloud Run revision crashes with `PrismaClientInitializationError` | `DATABASE_URL` not bound or Neon paused | `gcloud run services describe bloomrealyou-api --format='value(spec.template.spec.containers[0].env)'` — confirm secret is attached. Open Neon console; free-tier branches auto-resume on first query but take ~1 s. |
| Health endpoint times out | Cold start on a free-tier instance | Cloud Run cold start is ~3–5 s for this image. Hit `/health` twice, the second call returns instantly. Set `--min-instances=1` (~$5/mo) to eliminate. |
| Storefront calls return CORS errors | `API_CORS_ORIGINS` still `*` after locking down, or value has trailing slash | Run the step 8 update again with no trailing slashes, comma-separated. |
| `prisma migrate deploy` fails with `P1001 can't reach database` | Local IP not allowed-listed by Neon, or wrong connection string | Neon allows all IPs by default; double-check you copied the **Pooled** connection (port 5432, host ends with `-pooler`). |
