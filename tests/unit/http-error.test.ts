import {
  AppError,
  BadRequest,
  Conflict,
  NotFound,
  InternalError,
} from '../../src/core/http-error';

describe('http-error', () => {
  describe('AppError', () => {
    it('stores statusCode, message and details', () => {
      const err = new AppError(418, 'teapot', { hint: 'short and stout' });

      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(418);
      expect(err.message).toBe('teapot');
      expect(err.details).toEqual({ hint: 'short and stout' });
      expect(err.name).toBe('AppError');
    });

    it('leaves details undefined when not provided', () => {
      const err = new AppError(500, 'boom');
      expect(err.details).toBeUndefined();
    });

    it('preserves the prototype chain for instanceof checks', () => {
      // Regression guard for Object.setPrototypeOf in the constructor
      const err: unknown = new AppError(400, 'bad');
      expect(err instanceof AppError).toBe(true);
    });
  });

  describe('factories', () => {
    it('BadRequest builds a 400 with details', () => {
      const err = BadRequest('invalid', [{ path: 'x', message: 'nope' }]);
      expect(err.statusCode).toBe(400);
      expect(err.message).toBe('invalid');
      expect(err.details).toEqual([{ path: 'x', message: 'nope' }]);
    });

    it('Conflict builds a 409 without details', () => {
      const err = Conflict('already exists');
      expect(err.statusCode).toBe(409);
      expect(err.details).toBeUndefined();
    });

    it('NotFound builds a 404', () => {
      expect(NotFound('missing').statusCode).toBe(404);
    });

    it('InternalError builds a 500 with a default message', () => {
      const err = InternalError();
      expect(err.statusCode).toBe(500);
      expect(err.message).toBe('Internal server error');
    });

    it('InternalError accepts a custom message', () => {
      expect(InternalError('db down').message).toBe('db down');
    });
  });
});
