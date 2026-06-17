import request from 'supertest';
import { createApp } from '../src/app';
import redis from '../src/infra/cache/redis';

const app = createApp();
const CACHE_KEY = 'products:list';

// No beforeAll connect / afterAll destroy here.
// redis uses lazyConnect:true and auto-connects on first command.
// knex is also lazy. Both are shared singletons — tearing them down per-suite
// would race against other suites that still need them. --forceExit owns cleanup.

beforeEach(async () => {
  await redis.del(CACHE_KEY);
});

describe('GET /api/products', () => {
  it('returns 200 with product list containing required fields', async () => {
    const res = await request(app).get('/api/products');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const first = res.body.data[0];
    expect(first).toHaveProperty('product_code');
    expect(first).toHaveProperty('product_title');
    expect(first).toHaveProperty('product_price');
    // Must NOT expose internal id or timestamps
    expect(first).not.toHaveProperty('id');
  });

  it('first request reports X-Cache-Status: MISS', async () => {
    const res = await request(app).get('/api/products');
    expect(res.headers['x-cache-status']).toBe('MISS');
  });

  it('second request is served from cache (X-Cache-Status: HIT)', async () => {
    await request(app).get('/api/products'); // warm the cache
    const res = await request(app).get('/api/products');

    expect(res.status).toBe(200);
    expect(res.headers['x-cache-status']).toBe('HIT');
  });

  it('stores the result in Redis with a TTL close to CACHE_TTL', async () => {
    await request(app).get('/api/products');
    const ttl = await redis.ttl(CACHE_KEY);

    // TTL should be positive and ≤ configured 120 s
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(120);
  });
});
