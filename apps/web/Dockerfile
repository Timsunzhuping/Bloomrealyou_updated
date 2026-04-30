# syntax=docker/dockerfile:1.6
# -----------------------------------------------------------------------------
# Bloomrealyou Storefront (Next.js) — multi-stage production image.
#
#   docker build -f apps/web/Dockerfile -t bloomrealyou/web .
#
# Build args:
#   NEXT_PUBLIC_API_BASE_URL — public API URL baked into the bundle.
#   NEXT_PUBLIC_DEFAULT_LOCALE — default locale (en / zh-CN / es / ar).
# -----------------------------------------------------------------------------

ARG NODE_VERSION=20-alpine

FROM node:${NODE_VERSION} AS deps
WORKDIR /repo
RUN corepack enable && apk add --no-cache libc6-compat
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/web/package.json ./apps/web/package.json
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

FROM deps AS build
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
ARG NEXT_PUBLIC_DEFAULT_LOCALE=en
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_DEFAULT_LOCALE=$NEXT_PUBLIC_DEFAULT_LOCALE
COPY apps/web ./apps/web
RUN pnpm --filter @custom-merch/shared build \
 && pnpm --filter @custom-merch/i18n build \
 && pnpm --filter @custom-merch/sdk build \
 && pnpm --filter @custom-merch/ui build \
 && pnpm --filter @custom-merch/web build

FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000
RUN corepack enable && apk add --no-cache tini

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages ./packages
COPY apps/web/package.json ./apps/web/package.json
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter @custom-merch/web...

COPY --from=build /repo/apps/web/.next ./apps/web/.next
COPY --from=build /repo/apps/web/public ./apps/web/public
COPY --from=build /repo/apps/web/next.config.mjs ./apps/web/next.config.mjs

USER node
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["pnpm", "--filter", "@custom-merch/web", "start"]
