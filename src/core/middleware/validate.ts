import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Express middleware factory that validates `req.body` against a Zod schema.
 * On failure it responds with 400 and a structured errors array.
 * On success the parsed (coerced) body replaces `req.body`.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const details = (result.error as ZodError).issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));

      res.status(400).json({
        error: 'Validation failed',
        details,
      });
      return;
    }

    // Replace body with the schema-coerced value (e.g. ticket_number as int)
    req.body = result.data;
    next();
  };
}
