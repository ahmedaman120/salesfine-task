import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../../src/core/middleware/validate';

const schema = z.object({
  count: z.coerce.number().int(),
  name: z.string().min(1),
});

function mockRes(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('validate middleware', () => {
  it('calls next() and replaces req.body with parsed (coerced) data on success', () => {
    const req = { body: { count: '5', name: 'ok' } } as Request;
    const res = mockRes();
    const next = jest.fn() as unknown as NextFunction;

    validate(schema)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    // coerced from "5" -> 5
    expect(req.body).toEqual({ count: 5, name: 'ok' });
  });

  it('responds 400 with a structured details array on failure', () => {
    const req = { body: { count: 'abc' } } as Request;
    const res = mockRes();
    const next = jest.fn() as unknown as NextFunction;

    validate(schema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);

    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.error).toBe('Validation failed');
    expect(Array.isArray(payload.details)).toBe(true);
    const paths = payload.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['count', 'name']));
  });

  it('joins nested error paths with a dot', () => {
    const nested = z.object({ a: z.object({ b: z.string() }) });
    const req = { body: { a: {} } } as Request;
    const res = mockRes();
    const next = jest.fn() as unknown as NextFunction;

    validate(nested)(req, res, next);

    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.details[0].path).toBe('a.b');
  });
});
