import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../src/core/middleware/error-handler';
import { AppError, BadRequest } from '../../src/core/http-error';

function mockRes(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('errorHandler', () => {
  const req = {} as Request;
  const next = jest.fn() as unknown as NextFunction;

  it('maps an AppError to its statusCode and message', () => {
    const res = mockRes();

    errorHandler(new AppError(409, 'conflict'), req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'conflict' });
  });

  it('includes details when the AppError carries them', () => {
    const res = mockRes();

    errorHandler(BadRequest('bad', [{ path: 'x' }]), req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'bad',
      details: [{ path: 'x' }],
    });
  });

  it('returns 500 for an unknown (non-AppError) error and logs it', () => {
    const res = mockRes();
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    errorHandler(new Error('unexpected'), req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });

  it('returns 500 for a non-Error thrown value', () => {
    const res = mockRes();
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    errorHandler('a string error', req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    spy.mockRestore();
  });
});
