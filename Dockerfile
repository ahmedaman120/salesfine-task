# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /build

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled JS
COPY --from=builder /build/dist ./dist

# Copy migrations, seeds, and knexfile (run at container start without TS build)
COPY src/infra/db/knexfile.js ./src/infra/db/
COPY src/infra/db/migrations  ./src/infra/db/migrations
COPY src/infra/db/seeds       ./src/infra/db/seeds

# Entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
