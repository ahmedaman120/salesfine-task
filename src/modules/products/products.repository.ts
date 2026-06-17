import knex from '../../infra/db/knex';
import { Product } from './products.types';

export async function findAllProducts(): Promise<Product[]> {
  return knex<Product>('products').select(
    'product_code',
    'product_title',
    'product_price',
  );
}
