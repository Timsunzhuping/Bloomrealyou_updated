# syntax=docker/dockerfile:1.6
# -----------------------------------------------------------------------------
# Bloomrealyou API (NestJS) — multi-stage production image.
# -----------------------------------------------------------------------------
# Build with the repo root as the build context so workspace packages are
# available to the compiler:
#
#   docker build -f apps/api/Dockerfile -t bloomrealyou/api .
#
# Runtime expects DATABASE_URL, REDIS_URL, and the provider keys listed in
# .env.example. See docs/deployment.md for the full matrix.
# -----------------------------------------------------------------------------

ARG NODE_VERSION=20-alpine

# --- Dependency layer --------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /repo
RUN corepack enable && apk add --no-cache libc6-compat openssl
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY tsconfig.base.json ./tsconfig.base.json
COPY packages ./packages
COPY apps/api/package.json ./apps/api/package.json
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# --- Build layer -------------------------------------------------------------
FROM deps AS build
WORKDIR /repo
COPY apps/api ./apps/api
RUN pnpm --filter @custom-merch/db build \
 && pnpm --filter @custom-merch/shared build \
 && pnpm --filter @custom-merch/i18n build \
 && pnpm --filter @custom-merch/api build

# --- Runtime layer (slim) ----------------------------------------------------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    API_HOST=0.0.0.0 \
    API_PORT=4000
RUN corepack enable && apk add --no-cache openssl tini

# Copy lockfile + workspace metadata so pnpm can install only prod deps.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages ./packages
COPY apps/api/package.json ./apps/api/package.json
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter @custom-merch/api...

# Copy compiled output + Prisma client.
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/packages/db/dist ./packages/db/dist
COPY --from=build /repo/packages/shared/dist ./packages/shared/dist
COPY --from=build /repo/packages/i18n/dist ./packages/i18n/dist
# Generated Prisma client lives under node_modules; the runtime needs it.
COPY --from=build /repo/node_modules/.pnpm/@prisma+client* /app/node_modules/.pnpm/

USER node
EXPOSE 4000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/api/dist/main.js"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${API_PORT}/health || exit 1
