const mockRedis = {
  set: jest.fn(),
  eval: jest.fn(),
};

jest.mock('../../src/infra/cache/redis', () => ({
  __esModule: true,
  default: mockRedis,
}));

import { acquireLock, releaseLock } from '../../src/infra/cache/lock';

describe('acquireLock', () => {
  it('issues SET with PX/NX and returns true when Redis replies OK', async () => {
    mockRedis.set.mockResolvedValue('OK');

    const result = await acquireLock('lock:ticket:1', 'token-1', 5000);

    expect(result).toBe(true);
    expect(mockRedis.set).toHaveBeenCalledWith(
      'lock:ticket:1',
      'token-1',
      'PX',
      5000,
      'NX',
    );
  });

  it('returns false when the key already exists (Redis replies null)', async () => {
    mockRedis.set.mockResolvedValue(null);

    const result = await acquireLock('lock:ticket:1', 'token-1', 5000);

    expect(result).toBe(false);
  });
});

describe('releaseLock', () => {
  it('runs the compare-and-delete Lua script with the key and token', async () => {
    mockRedis.eval.mockResolvedValue(1);

    await releaseLock('lock:ticket:1', 'token-1');

    expect(mockRedis.eval).toHaveBeenCalledTimes(1);
    const [script, numKeys, key, token] = mockRedis.eval.mock.calls[0];
    expect(script).toContain('redis.call("DEL", KEYS[1])');
    expect(numKeys).toBe(1);
    expect(key).toBe('lock:ticket:1');
    expect(token).toBe('token-1');
  });

  it('propagates Redis errors to the caller', async () => {
    mockRedis.eval.mockRejectedValue(new Error('redis down'));

    await expect(releaseLock('k', 't')).rejects.toThrow('redis down');
  });
});
