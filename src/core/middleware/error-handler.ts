import { Request, Response, NextFunction } from 'express';
import { AppError } from '../http-error';

/**
 * Central error handler. Must be registered LAST in the Express pipeline
 * (4-argument signature). Converts AppError instances to structured JSON
 * responses; falls through to 500 for unexpected errors.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    const body: Record<string, unknown> = { error: err.message };
    if (err.details !== undefined) body.details = err.details;
    res.status(err.statusCode).json(body);
    return;
  }

  // Unknown / unexpected errors — log and return 500
  console.error('[Unhandled error]', err);
  res.status(500).json({ error: 'Internal server error' });
}
