import { randomUUID } from 'crypto';
import config from '../../config';
import { acquireLock, releaseLock } from '../../infra/cache/lock';
import { Conflict } from '../../core/http-error';
import { insertTicket, Ticket } from './tickets.repository';
import { CreateTicketDto } from './tickets.schema';

/** PG unique-violation error code */
const PG_UNIQUE_VIOLATION = '23505';

/**
 * Create a ticket with distributed-lock protection.
 *
 * Flow:
 *  1. Acquire a Redis lock keyed on ticket_number (SET NX PX).
 *     → If not acquired: another request is already processing the same number → 409.
 *  2. Attempt DB insert inside try/finally so the lock is always released.
 *     → DB UNIQUE constraint is the authoritative guarantee; 23505 → 409.
 *  3. Release the lock via Lua compare-and-delete.
 */
export async function createTicket(dto: CreateTicketDto): Promise<Ticket> {
  const lockKey = `lock:ticket:${dto.ticket_number}`;
  const lockToken = randomUUID();

  const acquired = await acquireLock(lockKey, lockToken, config.lockTtlMs);

  if (!acquired) {
    throw Conflict(
      'A request for this ticket_number is already being processed',
    );
  }

  try {
    return await insertTicket(dto);
  } catch (err: unknown) {
    // Map PostgreSQL unique-violation to a 409 Conflict
    if (
      err !== null &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === PG_UNIQUE_VIOLATION
    ) {
      throw Conflict('ticket_number already exists');
    }
    throw err;
  } finally {
    // Swallow Redis errors here — a failed unlock must not override the result
    // already returned/thrown by the try block. The lock's TTL guarantees
    // self-healing if the explicit release never reaches Redis.
    await releaseLock(lockKey, lockToken).catch((err: Error) => {
      console.error('[lock] failed to release lock for ticket', dto.ticket_number, ':', err.message);
    });
  }
}
