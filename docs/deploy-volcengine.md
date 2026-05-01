# Deploy Bloomrealyou to Volcengine ECS

This guide deploys the pnpm/Turborepo monorepo to a Volcengine ECS instance with Docker Compose.

## Architecture

- `web`: Next.js storefront on internal port `3000`
- `admin`: Next.js back-office on internal port `3001`
- `api`: NestJS API on internal port `4000`
- `postgres`: PostgreSQL 16, internal only
- `redis`: Redis 7, internal only
- `minio`: S3-compatible object storage, internal only
- `nginx`: public reverse proxy on port `80`

Without a custom domain, the default production template uses:

- Storefront: `http://101.47.76.12`
- API: `http://api.101.47.76.12.sslip.io`
- Admin: `http://admin.101.47.76.12.sslip.io`

`sslip.io` resolves the embedded IP address automatically, so no DNS console setup is required for this temporary no-domain deployment.

## Volcengine Security Group

Configure inbound rules in the Volcengine console:

| Protocol | Port | Source |
| --- | --- | --- |
| TCP | 22 | Your local public IP only, for example `x.x.x.x/32` |
| TCP | 80 | `0.0.0.0/0` |
| TCP | 443 | `0.0.0.0/0`, reserved for future HTTPS |

Do not expose database/cache/storage ports publicly: `5432`, `6379`, `9000`, `9001`.

## First-Time Server Setup

Assumes Ubuntu 22.04 and root login. Replace the SSH key path if needed.

```bash
ssh -i ~/.ssh/id_rsa root@101.47.76.12

apt update && apt upgrade -y
apt install -y git curl ca-certificates ufw

curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

docker version
docker compose version

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status
```

## Private GitHub Repository Access

This repository is private. The ECS server must be able to pull it.

Recommended option: add a GitHub deploy key.

```bash
ssh-keygen -t ed25519 -C "volcengine-bloomrealyou" -f /root/.ssh/bloomrealyou_deploy -N ""
cat /root/.ssh/bloomrealyou_deploy.pub
```

Add the printed public key in GitHub:

`Repository -> Settings -> Deploy keys -> Add deploy key`

- Title: `volcengine-bloomrealyou`
- Key: paste the public key
- Allow write access: off

Then configure SSH for GitHub on the server:

```bash
cat > /root/.ssh/config <<'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile /root/.ssh/bloomrealyou_deploy
  IdentitiesOnly yes
EOF
chmod 600 /root/.ssh/config
ssh -T git@github.com
```

## Clone and Configure

```bash
mkdir -p /opt/my-app
cd /opt/my-app
git clone git@github.com:Timsunzhuping/Bloomrealyou_updated.git repo
cd repo

cp .env.production.example .env.production
nano .env.production
chmod 600 .env.production
```

At minimum, change these values in `.env.production`:

- `POSTGRES_PASSWORD`
- `DATABASE_URL`, keeping the same password as `POSTGRES_PASSWORD`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `JWT_SECRET`
- Stripe/OpenAI/email/shipping secrets if using real providers

For a no-domain deployment, keep:

```env
PUBLIC_HOST=101.47.76.12
WEB_HOST=101.47.76.12
API_HOST=api.101.47.76.12.sslip.io
ADMIN_HOST=admin.101.47.76.12.sslip.io
APP_URL=http://101.47.76.12
API_URL=http://api.101.47.76.12.sslip.io
ADMIN_URL=http://admin.101.47.76.12.sslip.io
NEXT_PUBLIC_API_BASE_URL=http://api.101.47.76.12.sslip.io
NEXT_PUBLIC_ADMIN_API_BASE_URL=http://api.101.47.76.12.sslip.io
```

## Deploy

```bash
cd /opt/my-app/repo
chmod +x scripts/deploy.sh
APP_DIR=/opt/my-app/repo ./scripts/deploy.sh
```

Manual equivalent:

```bash
cd /opt/my-app/repo
docker compose --env-file .env.production up -d --build postgres redis minio migrate api web admin nginx
docker compose --env-file .env.production ps
```

## Verify

```bash
curl -I http://127.0.0.1
curl -I http://101.47.76.12
curl -I http://api.101.47.76.12.sslip.io
curl -I http://admin.101.47.76.12.sslip.io

docker compose --env-file .env.production ps
docker compose --env-file .env.production logs --tail=200 api
docker compose --env-file .env.production logs --tail=200 web
docker compose --env-file .env.production logs --tail=200 admin
docker compose --env-file .env.production logs --tail=200 nginx
```

## Update Deployment

```bash
ssh -i ~/.ssh/id_rsa root@101.47.76.12
cd /opt/my-app/repo
APP_DIR=/opt/my-app/repo ./scripts/deploy.sh
```

The script runs `git pull --ff-only`, rebuilds the Docker image, applies Prisma migrations, and restarts services.

## Rollback

```bash
cd /opt/my-app/repo
git log --oneline -5
git checkout <previous-good-commit>
docker compose --env-file .env.production up -d --build postgres redis minio migrate api web admin nginx
```

After confirming the rollback, either keep the detached commit temporarily or create a rollback branch/tag.

## Common Troubleshooting

Check service status:

```bash
docker compose --env-file .env.production ps
```

Check logs:

```bash
docker compose --env-file .env.production logs --tail=200 api
docker compose --env-file .env.production logs --tail=200 migrate
docker compose --env-file .env.production logs --tail=200 nginx
```

If Docker build fails during dependency install:

```bash
docker compose --env-file .env.production build --no-cache api
```

If Prisma migration fails, verify `DATABASE_URL` uses the internal Docker hostname:

```env
DATABASE_URL=postgresql://custom_merch:<password>@postgres:5432/custom_merch?schema=public
```

If the browser cannot access the site, verify both places:

- Volcengine security group allows inbound TCP `80`
- Server firewall allows `80/tcp`

```bash
ufw status
curl -I http://127.0.0.1
curl -I http://101.47.76.12
```

## Using a Real Domain Later

Point DNS records to `101.47.76.12`:

- `example.com` -> `101.47.76.12`
- `api.example.com` -> `101.47.76.12`
- `admin.example.com` -> `101.47.76.12`

Then update `.env.production`:

```env
PUBLIC_HOST=example.com
WEB_HOST=example.com
API_HOST=api.example.com
ADMIN_HOST=admin.example.com
APP_URL=https://example.com
API_URL=https://api.example.com
ADMIN_URL=https://admin.example.com
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
NEXT_PUBLIC_ADMIN_API_BASE_URL=https://api.example.com
API_CORS_ORIGINS=https://example.com,https://admin.example.com
```

For HTTPS, switch the proxy to Caddy or add Certbot-managed certificates to Nginx.

## Optional GitHub Actions Deployment

After the first manual deploy works, add these GitHub Secrets:

- `SERVER_IP`: `101.47.76.12`
- `SSH_USER`: `root`
- `SSH_PRIVATE_KEY`: private key allowed to SSH into ECS
- `DEPLOY_DIR`: `/opt/my-app/repo`

Then a workflow can SSH into the server and run:

```bash
cd "$DEPLOY_DIR"
APP_DIR="$DEPLOY_DIR" ./scripts/deploy.sh
```
