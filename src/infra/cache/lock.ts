import redis from './redis';

/**
 * Lua script for atomic compare-and-delete.
 * Only deletes the key if its value matches the caller's token,
 * so we never accidentally release another holder's lock.
 */
const RELEASE_SCRIPT = `
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
  else
    return 0
  end
`;

/**
 * Try to acquire a distributed lock using Redis SET NX PX.
 *
 * @param key   - Redis key for the lock
 * @param token - Unique value owned by this caller (typically a UUID)
 * @param ttlMs - Lock expiry in milliseconds (auto-release if holder dies)
 * @returns true if the lock was acquired, false otherwise
 */
export async function acquireLock(
  key: string,
  token: string,
  ttlMs: number,
): Promise<boolean> {
  const result = await redis.set(key, token, 'PX', ttlMs, 'NX');
  return result === 'OK';
}

/**
 * Release a distributed lock — only if this caller still owns it.
 * Uses a Lua compare-and-delete to prevent releasing another holder's lock
 * if our TTL expired mid-flight.
 *
 * @param key   - Redis key for the lock
 * @param token - The same token used when acquiring the lock
 */
export async function releaseLock(key: string, token: string): Promise<void> {
  await redis.eval(RELEASE_SCRIPT, 1, key, token);
}
