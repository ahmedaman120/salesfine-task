/**
 * Knex configuration file — plain JS so it works without a TS compilation
 * step (used by the `knex` CLI in the Docker entrypoint and npm scripts).
 */
'use strict';

const path = require('path');

const db = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'salesfin',
  user: process.env.DB_USER || 'salesfin',
  password: process.env.DB_PASSWORD || 'salesfin',
};

/** @type {import('knex').Knex.Config} */
module.exports = {
  client: 'pg',
  connection: db,
  migrations: {
    directory: path.join(__dirname, 'migrations'),
    extension: 'js',
  },
  seeds: {
    directory: path.join(__dirname, 'seeds'),
    extension: 'js',
  },
  pool: { min: 2, max: 10 },
};
