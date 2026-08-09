#!/bin/sh
set -e

# The database lives on a Docker volume, which starts empty on a fresh install.
# Applying migrations on every boot makes the container self-sufficient: it is
# safe to re-run, and it means `docker compose up` alone produces a working
# server with no manual setup step.
echo "→ Applying database migrations…"
npx prisma migrate deploy

# The seed upserts on natural keys, so running it on every boot is safe: it
# restores the baseline channels without disturbing content created since.
echo "→ Seeding baseline channels…"
npx tsx prisma/seed.ts || echo "  (seed skipped — continuing)"

echo "→ Starting the RSS server on port ${PORT:-3000}…"
exec npm run start
