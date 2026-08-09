# La Trobe RSS Server — production image.
#
# Two stages: the builder installs every dependency and compiles the Next.js
# application; the runner carries only what is needed to serve it. Both use
# node:22-slim (Debian) rather than Alpine, because the SQLite driver is a
# native module and the glibc build has prebuilt binaries available.

# ---- builder ----------------------------------------------------------------
FROM node:22-slim AS builder
WORKDIR /app

# openssl and the build toolchain are needed in case better-sqlite3 has to be
# compiled from source rather than using a published prebuild.
RUN apt-get update && apt-get install -y --no-install-recommends \
      openssl ca-certificates python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Dependencies are copied and installed before the source, so editing a
# component does not invalidate the (slow) npm ci layer.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# The DATABASE_URL is only needed so the Prisma generate/build steps resolve;
# the real value is supplied at run time by docker-compose.
ENV DATABASE_URL="file:/data/rss.db"
RUN npx prisma generate
RUN npm run build

# Strip development dependencies, but keep the Prisma CLI: the container runs
# `prisma migrate deploy` on start-up so the schema is applied to the volume.
RUN npm prune --omit=dev && npm install --no-save prisma dotenv tsx

# ---- runner -----------------------------------------------------------------
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL="file:/data/rss.db"

RUN apt-get update && apt-get install -y --no-install-recommends \
      openssl ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

# Run as a non-root user. The database lives on a volume at /data, which must be
# writable by that user — hence the chown before the USER switch.
RUN groupadd -r nodejs && useradd -r -g nodejs -m nextjs

COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.ts ./next.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./docker-entrypoint.sh

RUN mkdir -p /data && chown -R nextjs:nodejs /data /app && chmod +x ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000

# Polls the real healthcheck, which probes the database rather than just
# reporting that the process is alive.
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS http://localhost:3000/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
