/**
 * Centralised, typed configuration.
 * All env access is funnelled through this file so there is a single place
 * to validate/default and no scattered `process.env` reads elsewhere.
 */

function required(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

const config = {
  env: optional('NODE_ENV', 'development'),
  port: parseInt(optional('PORT', '3000'), 10),

  db: {
    host: optional('DB_HOST', 'localhost'),
    port: parseInt(optional('DB_PORT', '5432'), 10),
    name: optional('DB_NAME', 'salesfin'),
    user: optional('DB_USER', 'salesfin'),
    password: optional('DB_PASSWORD', 'salesfin'),
  },

  redis: {
    host: optional('REDIS_HOST', 'localhost'),
    port: parseInt(optional('REDIS_PORT', '6379'), 10),
  },

  /** Cache TTL for the products list endpoint (seconds) */
  cacheTtl: parseInt(optional('CACHE_TTL', '120'), 10),

  /** Distributed lock TTL for ticket creation (milliseconds) */
  lockTtlMs: parseInt(optional('LOCK_TTL_MS', '5000'), 10),
} as const;

export default config;
