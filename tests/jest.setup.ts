/**
 * Jest global setup — runs ONCE before all test suites.
 *
 * Responsibilities:
 *  1. Run migrations so the schema exists.
 *  2. Seed products so the list endpoint has data.
 *  3. Nothing else — per-test cleanup lives in beforeEach hooks inside each suite.
 */
import Knex from 'knex';
import path from 'path';

export default async function globalSetup(): Promise<void> {
  const knex = Knex({
    client: 'pg',
    connection: {
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      database: process.env.DB_NAME ?? 'salesfin',
      user: process.env.DB_USER ?? 'salesfin',
      password: process.env.DB_PASSWORD ?? 'salesfin',
    },
  });

  try {
    // Run all pending migrations
    await knex.migrate.latest({
      directory: path.join(__dirname, '../src/infra/db/migrations'),
      extension: 'js',
    });

    // Seed products (idempotent — seed deletes before inserting)
    await knex.seed.run({
      directory: path.join(__dirname, '../src/infra/db/seeds'),
      extension: 'js',
    });
  } finally {
    await knex.destroy();
  }
}
