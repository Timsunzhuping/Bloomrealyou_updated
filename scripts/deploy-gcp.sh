#!/usr/bin/env bash
#
# Bloomrealyou — Google Cloud Run + Neon one-shot deployer.
#
# Run this from the repo root *after* you've created a Neon project and
# copied the pooled connection string. The script is idempotent: re-run on
# failure and it picks up where it left off.
#
#   bash scripts/deploy-gcp.sh
#
# Override the defaults via env vars:
#   PROJECT_ID=my-bloom REGION=us-central1 bash scripts/deploy-gcp.sh

set -euo pipefail

# -----------------------------------------------------------------------------
# Defaults — override with env vars before invoking the script.
# -----------------------------------------------------------------------------
PROJECT_ID="${PROJECT_ID:-bloomrealyou-prod}"
REGION="${REGION:-us-central1}"
REPO="${REPO:-bloomrealyou}"
SERVICE="${SERVICE:-bloomrealyou-api}"

# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------
c_blue()  { printf "\033[1;34m%s\033[0m\n" "$*"; }
c_green() { printf "\033[1;32m%s\033[0m\n" "$*"; }
c_red()   { printf "\033[1;31m%s\033[0m\n" "$*" >&2; }
c_dim()   { printf "\033[2m%s\033[0m\n" "$*"; }

step() { echo; c_blue "▶ $*"; }
ok()   { c_green "  ✓ $*"; }
warn() { printf "\033[1;33m  ! %s\033[0m\n" "$*"; }
die()  { c_red "✗ $*"; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing dependency: $1"
}

prompt_secret() {
  local var="$1" label="$2" value=""
  printf "  %s: " "$label" >&2
  IFS= read -rs value
  echo >&2
  [ -n "$value" ] || die "Empty value for $label"
  printf -v "$var" "%s" "$value"
}

confirm() {
  local prompt="$1" reply
  printf "  %s [y/N] " "$prompt" >&2
  read -r reply
  [[ "$reply" =~ ^[Yy]$ ]]
}

# -----------------------------------------------------------------------------
# 0. Preflight
# -----------------------------------------------------------------------------
step "0. Preflight"
require_cmd gcloud
require_cmd openssl

if [ ! -f cloudbuild.yaml ] || [ ! -f apps/api/Dockerfile ]; then
  die "Run from the repo root (cloudbuild.yaml and apps/api/Dockerfile must exist)"
fi
ok "running from repo root"

ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format='value(account)' | head -1)
[ -n "$ACTIVE_ACCOUNT" ] || die "Run 'gcloud auth login' first"
ok "authenticated as $ACTIVE_ACCOUNT"

# -----------------------------------------------------------------------------
# 1. Project
# -----------------------------------------------------------------------------
step "1. Project ($PROJECT_ID)"
if gcloud projects describe "$PROJECT_ID" >/dev/null 2>&1; then
  ok "project exists"
else
  c_dim "  creating..."
  gcloud projects create "$PROJECT_ID" --name="Bloomrealyou" >/dev/null
  ok "project created"
fi

gcloud config set project "$PROJECT_ID" >/dev/null 2>&1
gcloud config set run/region "$REGION" >/dev/null 2>&1
ok "default project + region set"

# -----------------------------------------------------------------------------
# 2. Billing
# -----------------------------------------------------------------------------
step "2. Billing"
BILLING_ENABLED=$(gcloud billing projects describe "$PROJECT_ID" \
  --format='value(billingEnabled)' 2>/dev/null || echo "False")

if [ "$BILLING_ENABLED" = "True" ]; then
  ok "billing already linked"
else
  c_dim "  available billing accounts:"
  gcloud billing accounts list --filter=open=true \
    --format='table(name.basename(),displayName,open)' || true
  printf "  Enter billing account ID (e.g. 011AAA-222BBB-333CCC): "
  read -r BILLING_ID
  [ -n "$BILLING_ID" ] || die "Billing account ID required"
  gcloud billing projects link "$PROJECT_ID" --billing-account="$BILLING_ID" >/dev/null
  ok "billing linked to $BILLING_ID"
fi

# -----------------------------------------------------------------------------
# 3. APIs
# -----------------------------------------------------------------------------
step "3. APIs"
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  --project="$PROJECT_ID" >/dev/null
ok "Cloud Run / Cloud Build / Artifact Registry / Secret Manager enabled"

# -----------------------------------------------------------------------------
# 4. Artifact Registry
# -----------------------------------------------------------------------------
step "4. Artifact Registry ($REPO @ $REGION)"
if gcloud artifacts repositories describe "$REPO" --location="$REGION" >/dev/null 2>&1; then
  ok "repo exists"
else
  gcloud artifacts repositories create "$REPO" \
    --repository-format=docker \
    --location="$REGION" \
    --description="Bloomrealyou container images" >/dev/null
  ok "repo created"
fi

# -----------------------------------------------------------------------------
# 5. Secrets (DATABASE_URL, JWT_SECRET)
# -----------------------------------------------------------------------------
step "5. Secret Manager"

ensure_secret() {
  local name="$1" value="$2"
  if gcloud secrets describe "$name" >/dev/null 2>&1; then
    if confirm "Secret $name exists — overwrite with new version?"; then
      printf "%s" "$value" | gcloud secrets versions add "$name" --data-file=- >/dev/null
      ok "$name updated"
    else
      ok "$name kept"
    fi
  else
    printf "%s" "$value" | gcloud secrets create "$name" --data-file=- >/dev/null
    ok "$name created"
  fi
}

prompt_secret NEON_URL "Paste your Neon pooled connection string"
ensure_secret DATABASE_URL "$NEON_URL"

JWT=$(openssl rand -hex 32 | tr -d '\n')
ensure_secret JWT_SECRET "$JWT"

PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

for s in DATABASE_URL JWT_SECRET; do
  gcloud secrets add-iam-policy-binding "$s" \
    --member="serviceAccount:${RUNTIME_SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --condition=None >/dev/null 2>&1 || true
done
ok "runtime SA granted secret accessor"

# Cloud Build SA needs writer on the repo (idempotent).
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/artifactregistry.writer" \
  --condition=None >/dev/null 2>&1 || true
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/run.admin" \
  --condition=None >/dev/null 2>&1 || true
gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA" \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/iam.serviceAccountUser" >/dev/null 2>&1 || true
ok "Cloud Build SA granted artifact writer + run admin"

# -----------------------------------------------------------------------------
# 6. Build + deploy
# -----------------------------------------------------------------------------
step "6. Cloud Build → Cloud Run (this takes 6-8 min on first run)"
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=_REGION="$REGION",_REPO="$REPO",_SERVICE="$SERVICE"
ok "image built + service deployed"

# -----------------------------------------------------------------------------
# 7. Wire env + secrets onto the Cloud Run service
# -----------------------------------------------------------------------------
step "7. Bind env vars + secrets"
gcloud run services update "$SERVICE" \
  --region="$REGION" \
  --update-secrets=DATABASE_URL=DATABASE_URL:latest,JWT_SECRET=JWT_SECRET:latest \
  --update-env-vars="^|^NODE_ENV=production|API_HOST=0.0.0.0|API_CORS_ORIGINS=*|IDEMPOTENCY_STORE_BACKEND=memory|NOTIFICATIONS_QUEUE_DRIVER=memory|NOTIFICATION_PROVIDER=mock|SHIPPING_PROVIDER=mock|AI_PROVIDER=mock" \
  >/dev/null
ok "env vars + secrets attached"

# -----------------------------------------------------------------------------
# 8. Done — print URL + next steps
# -----------------------------------------------------------------------------
URL=$(gcloud run services describe "$SERVICE" \
  --region="$REGION" \
  --format='value(status.url)')

echo
c_green "════════════════════════════════════════════════════════════════"
c_green "  Cloud Run deployment complete!"
c_green "════════════════════════════════════════════════════════════════"
echo
echo "  Service URL: $URL"
echo
echo "  Next:"
echo "    1. Run database migrations from your laptop:"
echo "         export DATABASE_URL=\"<your Neon pooled URL>\""
echo "         cd apps/api && pnpm prisma migrate deploy && pnpm prisma db seed"
echo
echo "    2. Smoke-test:"
echo "         curl -s $URL/health"
echo
echo "    3. Set NEXT_PUBLIC_API_BASE_URL on Vercel to:"
echo "         $URL"
echo
echo "    4. Tighten CORS once Vercel URLs are known:"
echo "         gcloud run services update $SERVICE --region=$REGION \\"
echo "           --update-env-vars=API_CORS_ORIGINS=https://<web>.vercel.app,https://<admin>.vercel.app"
echo
