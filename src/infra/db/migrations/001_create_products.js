'use strict';

/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('products', (t) => {
    t.increments('id').primary();
    t.string('product_code').notNullable().unique();
    t.string('product_title').notNullable();
    t.decimal('product_price', 10, 2).notNullable();
    t.timestamps(true, true);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('products');
};
