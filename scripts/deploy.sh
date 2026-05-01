#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/my-app/repo}"
ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"

cd "$APP_DIR"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE. Copy .env.production.example to $ENV_FILE and fill production values first." >&2
  exit 1
fi

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Fetching latest code..."
  git fetch --all --prune
  git pull --ff-only
fi

echo "Building and starting services..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build postgres redis minio migrate api web admin nginx

echo "Service status:"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

echo "Recent application logs:"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=80 api web admin nginx

PUBLIC_HOST="$(grep -E '^PUBLIC_HOST=' "$ENV_FILE" | tail -n1 | cut -d= -f2- || true)"
API_HOST="$(grep -E '^API_HOST=' "$ENV_FILE" | tail -n1 | cut -d= -f2- || true)"
ADMIN_HOST="$(grep -E '^ADMIN_HOST=' "$ENV_FILE" | tail -n1 | cut -d= -f2- || true)"
PUBLIC_HOST="${PUBLIC_HOST:-101.47.76.12}"
API_HOST="${API_HOST:-api.101.47.76.12.sslip.io}"
ADMIN_HOST="${ADMIN_HOST:-admin.101.47.76.12.sslip.io}"

echo "Checking reverse proxy..."
curl -fsSI "http://127.0.0.1" >/dev/null && echo "web: ok http://$PUBLIC_HOST"
curl -fsSI -H "Host: $API_HOST" "http://127.0.0.1" >/dev/null && echo "api: ok http://$API_HOST"
curl -fsSI -H "Host: $ADMIN_HOST" "http://127.0.0.1" >/dev/null && echo "admin: ok http://$ADMIN_HOST"

echo "Deploy complete."
