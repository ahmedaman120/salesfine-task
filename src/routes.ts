import { Express, Request, Response } from 'express';
import { productsRouter } from './modules/products/products.routes';
import { ticketsRouter } from './modules/tickets/tickets.routes';

export function registerRoutes(app: Express): void {
  // Health check (used by smoke tests and liveness probes)
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/products', productsRouter);
  app.use('/api/tickets', ticketsRouter);
}
