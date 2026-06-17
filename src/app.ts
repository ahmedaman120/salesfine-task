import express from 'express';
import { registerRoutes } from './routes';
import { errorHandler } from './core/middleware/error-handler';

/**
 * Pure app factory — does not call listen().
 * Importing this file is safe in test code; supertest can attach directly.
 */
export function createApp() {
  const app = express();

  app.use(express.json());

  registerRoutes(app);

  // Central error handler must come after all routes
  app.use(errorHandler);

  return app;
}
