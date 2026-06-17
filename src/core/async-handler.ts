import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async Express route handler so that any rejected promise
 * is forwarded to `next(err)` rather than producing an unhandled rejection.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
