import Knex from 'knex';
import config from '../../config';

// Single shared Knex instance for the entire process.
const knex = Knex({
  client: 'pg',
  connection: {
    host: config.db.host,
    port: config.db.port,
    database: config.db.name,
    user: config.db.user,
    password: config.db.password,
  },
  pool: { min: 2, max: 10 },
});

export default knex;
