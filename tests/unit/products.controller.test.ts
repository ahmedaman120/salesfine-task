jest.mock('../../src/modules/products/products.service', () => ({
  listProducts: jest.fn(),
}));

import { Request, Response } from 'express';
import { getProducts } from '../../src/modules/products/products.controller';
import { listProducts } from '../../src/modules/products/products.service';

const listProductsMock = listProducts as jest.Mock;

const products = [
  { product_code: 'PROD-001', product_title: 'Keyboard', product_price: 49.99 },
];

function mockRes(): Response {
  const res = {} as Response;
  res.setHeader = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('getProducts', () => {
  it('sets X-Cache-Status: MISS and returns { data }', async () => {
    listProductsMock.mockResolvedValue({ data: products, cacheStatus: 'MISS' });

    const res = mockRes();
    await getProducts({} as Request, res);

    expect(res.setHeader).toHaveBeenCalledWith('X-Cache-Status', 'MISS');
    expect(res.json).toHaveBeenCalledWith({ data: products });
  });

  it('reflects the HIT cache status in the header', async () => {
    listProductsMock.mockResolvedValue({ data: products, cacheStatus: 'HIT' });

    const res = mockRes();
    await getProducts({} as Request, res);

    expect(res.setHeader).toHaveBeenCalledWith('X-Cache-Status', 'HIT');
  });
});
