/**
 * Typed application error.
 * Thrown anywhere in the request stack; the central error handler converts
 * it to an appropriate HTTP response.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
    // Restore prototype chain (needed when extending built-ins in TS)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ── Convenience factories ────────────────────────────────────────────────────

export const BadRequest = (message: string, details?: unknown): AppError =>
  new AppError(400, message, details);

export const Conflict = (message: string): AppError =>
  new AppError(409, message);

export const NotFound = (message: string): AppError =>
  new AppError(404, message);

export const InternalError = (message = 'Internal server error'): AppError =>
  new AppError(500, message);
