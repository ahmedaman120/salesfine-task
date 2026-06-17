const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
};

jest.mock('../../src/infra/cache/redis', () => ({
  __esModule: true,
  default: mockRedis,
}));

jest.mock('../../src/modules/products/products.repository', () => ({
  findAllProducts: jest.fn(),
}));

import { listProducts } from '../../src/modules/products/products.service';
import { findAllProducts } from '../../src/modules/products/products.repository';
import config from '../../src/config';

const findAllProductsMock = findAllProducts as jest.Mock;

const products = [
  { product_code: 'PROD-001', product_title: 'Keyboard', product_price: 49.99 },
];

const CACHE_KEY = 'products:list';

describe('listProducts', () => {
  it('returns cached data with cacheStatus HIT without querying the DB', async () => {
    mockRedis.get.mockResolvedValue(JSON.stringify(products));

    const result = await listProducts();

    expect(result).toEqual({ data: products, cacheStatus: 'HIT' });
    expect(findAllProductsMock).not.toHaveBeenCalled();
    expect(mockRedis.set).not.toHaveBeenCalled();
  });

  it('queries the DB and populates the cache with cacheStatus MISS on a cold cache', async () => {
    mockRedis.get.mockResolvedValue(null);
    findAllProductsMock.mockResolvedValue(products);

    const result = await listProducts();

    expect(result).toEqual({ data: products, cacheStatus: 'MISS' });
    expect(findAllProductsMock).toHaveBeenCalledTimes(1);
    expect(mockRedis.set).toHaveBeenCalledWith(
      CACHE_KEY,
      JSON.stringify(products),
      'EX',
      config.cacheTtl,
    );
  });
});
