import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../../src/core/async-handler';

describe('asyncHandler', () => {
  const req = {} as Request;
  const res = {} as Response;

  it('invokes the wrapped handler with (req, res, next)', async () => {
    const fn = jest.fn().mockResolvedValue(undefined);
    const next = jest.fn() as unknown as NextFunction;

    await asyncHandler(fn)(req, res, next);

    expect(fn).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards a rejected promise to next()', async () => {
    const error = new Error('boom');
    const fn = jest.fn().mockRejectedValue(error);
    const next = jest.fn() as unknown as NextFunction;

    await asyncHandler(fn)(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('does not call next() when the handler resolves', async () => {
    const fn = jest.fn().mockResolvedValue(undefined);
    const next = jest.fn() as unknown as NextFunction;

    await asyncHandler(fn)(req, res, next);

    expect(next).not.toHaveBeenCalled();
  });
});
