# syntax=docker/dockerfile:1.6
# -----------------------------------------------------------------------------
# Bloomrealyou Admin Console (Next.js) — multi-stage production image.
#
#   docker build -f apps/admin/Dockerfile -t bloomrealyou/admin .
#
# Build args:
#   NEXT_PUBLIC_ADMIN_API_BASE_URL — public API URL baked into the bundle.
# -----------------------------------------------------------------------------

ARG NODE_VERSION=20-alpine

FROM node:${NODE_VERSION} AS deps
WORKDIR /repo
RUN corepack enable && apk add --no-cache libc6-compat
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/admin/package.json ./apps/admin/package.json
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

FROM deps AS build
ARG NEXT_PUBLIC_ADMIN_API_BASE_URL=http://localhost:4000
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_ADMIN_API_BASE_URL=$NEXT_PUBLIC_ADMIN_API_BASE_URL
COPY apps/admin ./apps/admin
RUN pnpm --filter @custom-merch/shared build \
 && pnpm --filter @custom-merch/i18n build \
 && pnpm --filter @custom-merch/sdk build \
 && pnpm --filter @custom-merch/ui build \
 && pnpm --filter @custom-merch/admin build

FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3001
RUN corepack enable && apk add --no-cache tini

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages ./packages
COPY apps/admin/package.json ./apps/admin/package.json
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter @custom-merch/admin...

COPY --from=build /repo/apps/admin/.next ./apps/admin/.next
COPY --from=build /repo/apps/admin/public ./apps/admin/public
COPY --from=build /repo/apps/admin/next.config.mjs ./apps/admin/next.config.mjs

USER node
EXPOSE 3001
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["pnpm", "--filter", "@custom-merch/admin", "start"]
