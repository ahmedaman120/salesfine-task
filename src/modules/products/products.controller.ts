import { Request, Response } from 'express';
import { listProducts } from './products.service';

export async function getProducts(req: Request, res: Response): Promise<void> {
  const { data, cacheStatus } = await listProducts();

  // Expose cache status via a custom header so reviewers can observe caching
  res.setHeader('X-Cache-Status', cacheStatus);
  res.json({ data });
}
