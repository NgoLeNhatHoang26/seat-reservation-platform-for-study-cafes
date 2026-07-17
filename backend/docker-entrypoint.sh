#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

if [ "${RUN_SEED:-false}" = "true" ]; then
  if [ "${NODE_ENV:-development}" = "production" ] && [ "${ALLOW_DEMO_SEED:-false}" != "true" ]; then
    echo "Skipping seed in production (demo accounts blocked unless ALLOW_DEMO_SEED=true)."
  else
    echo "Seeding database..."
    npx tsx prisma/seed.ts || echo "WARN: seed failed — starting API anyway."
  fi
fi

echo "Starting application..."
exec "$@"
