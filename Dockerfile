# syntax=docker/dockerfile:1
#
# One image for the whole product: Express API + the built React SPA on the same
# origin (cookies stay first-party, no nginx rewrite needed). Build with:
#   docker compose -f docker-compose.prod.yml up -d --build

# ---- API build -------------------------------------------------------------
FROM node:24-bookworm-slim AS api-build
WORKDIR /app/apps/api
COPY apps/api/package.json apps/api/package-lock.json ./
# The postinstall hook runs `prisma generate`, so the schema must be present
# before `npm ci`.
COPY apps/api/prisma ./prisma
RUN npm ci
COPY apps/api/tsconfig.json ./
COPY apps/api/src ./src
COPY apps/api/scripts ./scripts
RUN npx prisma generate && npm run build

# ---- Production dependencies only -----------------------------------------
# tsc, vitest, supertest, tsx, @types/* and oxlint stay out of the runtime image.
FROM node:24-bookworm-slim AS api-deps
WORKDIR /app/apps/api
COPY apps/api/package.json apps/api/package-lock.json ./
COPY apps/api/prisma ./prisma
RUN npm ci --omit=dev \
 && npx prisma generate \
 && npm cache clean --force

# ---- Web build -------------------------------------------------------------
FROM node:24-bookworm-slim AS web-build
WORKDIR /app/apps/web
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci
COPY apps/web/ ./
RUN npm run build

# ---- Runtime ---------------------------------------------------------------
FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production

# Production refuses to boot without CLAMAV_ENABLED=true, so the real clamscan
# binary (and its signatures) must be present in the image. Signatures are
# refreshed while the container runs (see scripts/docker-entrypoint.sh), not
# only at build time.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates clamav \
 && rm -rf /var/lib/apt/lists/* \
 && (freshclam --quiet || echo "freshclam failed; the entrypoint retries at start")

WORKDIR /app/apps/api
COPY --from=api-deps /app/apps/api/node_modules ./node_modules
COPY --from=api-build /app/apps/api/dist ./dist
COPY --from=api-build /app/apps/api/prisma ./prisma
COPY --from=api-build /app/apps/api/scripts ./scripts
COPY --from=api-build /app/apps/api/package.json ./
# WEB_DIST_DIR default is ../web/dist relative to the API working directory.
COPY --from=web-build /app/apps/web/dist /app/apps/web/dist

RUN chmod +x ./scripts/docker-entrypoint.sh \
 && mkdir -p /var/lib/saba-tarkhis/storage /var/lib/saba-tarkhis/quarantine \
 && chmod 700 /var/lib/saba-tarkhis/storage /var/lib/saba-tarkhis/quarantine

EXPOSE 4000

ENTRYPOINT ["./scripts/docker-entrypoint.sh"]
CMD []
