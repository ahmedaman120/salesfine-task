#!/bin/sh
set -e

echo "[entrypoint] Running database migrations..."
npx knex --knexfile src/infra/db/knexfile.js migrate:latest

echo "[entrypoint] Running seeds..."
npx knex --knexfile src/infra/db/knexfile.js seed:run

echo "[entrypoint] Starting application..."
exec node dist/server.js
