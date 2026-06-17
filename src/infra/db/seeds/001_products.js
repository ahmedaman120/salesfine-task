'use strict';

/** @param {import('knex').Knex} knex */
exports.seed = async function (knex) {
  // Idempotent: delete existing rows before re-inserting.
  await knex('products').del();

  await knex('products').insert([
    { product_code: 'PROD-001', product_title: 'Wireless Keyboard', product_price: 49.99 },
    { product_code: 'PROD-002', product_title: 'Mechanical Mouse', product_price: 34.95 },
    { product_code: 'PROD-003', product_title: 'USB-C Hub (7-in-1)', product_price: 29.00 },
    { product_code: 'PROD-004', product_title: '27" 4K Monitor', product_price: 349.00 },
    { product_code: 'PROD-005', product_title: 'Noise-Cancelling Headset', product_price: 89.99 },
  ]);
};
