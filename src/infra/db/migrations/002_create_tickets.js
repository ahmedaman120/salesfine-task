'use strict';

/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('tickets', (t) => {
    t.increments('id').primary();
    t.integer('ticket_number').notNullable().unique();
    t.string('subject').notNullable();
    t.text('description').notNullable();
    t.timestamps(true, true);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('tickets');
};
