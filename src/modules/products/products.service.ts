import redis from '../../infra/cache/redis';
import config from '../../config';
import { findAllProducts } from './products.repository';
import { Product } from './products.types';

const CACHE_KEY = 'products:list';

export type CacheStatus = 'HIT' | 'MISS';

export interface ProductsResult {
  data: Product[];
  cacheStatus: CacheStatus;
}

/**
 * Cache-aside pattern:
 *  1. Check Redis for a cached result.
 *  2. On HIT  → parse and return immediately.
 *  3. On MISS → query the database, cache the result with a TTL, then return.
 */
export async function listProducts(): Promise<ProductsResult> {
  const cached = await redis.get(CACHE_KEY);

  if (cached !== null) {
    return { data: JSON.parse(cached) as Product[], cacheStatus: 'HIT' };
  }

  const data = await findAllProducts();
  await redis.set(CACHE_KEY, JSON.stringify(data), 'EX', config.cacheTtl);

  return { data, cacheStatus: 'MISS' };
}
