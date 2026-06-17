/**
 * Bootstrap: connect infra, start listening, handle graceful shutdown.
 * This file is the only entry point that calls app.listen().
 */
import { createApp } from './app';
import config from './config';
import knex from './infra/db/knex';
import redis from './infra/cache/redis';

async function main() {
  // ── Connect infrastructure ──────────────────────────────────────────────
  await redis.connect();
  console.log('[Redis] connected');

  // Verify DB connectivity (Knex is lazy; raw query forces a real connection)
  await knex.raw('SELECT 1');
  console.log('[DB] connected');

  // ── Start HTTP server ───────────────────────────────────────────────────
  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`[Server] listening on port ${config.port} (${config.env})`);
  });

  // ── Graceful shutdown ───────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    console.log(`[Server] ${signal} received — shutting down gracefully`);
    server.close(async () => {
      await Promise.allSettled([knex.destroy(), redis.quit()]);
      console.log('[Server] closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[Server] fatal startup error:', err);
  process.exit(1);
});
