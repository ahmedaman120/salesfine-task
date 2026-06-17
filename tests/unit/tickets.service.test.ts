jest.mock('../../src/infra/cache/lock', () => ({
  acquireLock: jest.fn(),
  releaseLock: jest.fn(),
}));

jest.mock('../../src/modules/tickets/tickets.repository', () => ({
  insertTicket: jest.fn(),
}));

import { createTicket } from '../../src/modules/tickets/tickets.service';
import { acquireLock, releaseLock } from '../../src/infra/cache/lock';
import { insertTicket } from '../../src/modules/tickets/tickets.repository';
import { AppError } from '../../src/core/http-error';

const acquireLockMock = acquireLock as jest.Mock;
const releaseLockMock = releaseLock as jest.Mock;
const insertTicketMock = insertTicket as jest.Mock;

const dto = {
  ticket_number: 7,
  subject: 'Subject',
  description: 'Description',
};

const savedTicket = {
  id: 1,
  ...dto,
  created_at: new Date(),
  updated_at: new Date(),
};

describe('createTicket', () => {
  beforeEach(() => {
    releaseLockMock.mockResolvedValue(undefined);
  });

  it('inserts the ticket and releases the lock on success', async () => {
    acquireLockMock.mockResolvedValue(true);
    insertTicketMock.mockResolvedValue(savedTicket);

    const result = await createTicket(dto);

    expect(result).toBe(savedTicket);
    expect(acquireLockMock).toHaveBeenCalledWith(
      'lock:ticket:7',
      expect.any(String),
      expect.any(Number),
    );
    expect(insertTicketMock).toHaveBeenCalledWith(dto);
    expect(releaseLockMock).toHaveBeenCalledTimes(1);
  });

  it('throws 409 and skips the insert when the lock is not acquired', async () => {
    acquireLockMock.mockResolvedValue(false);

    await expect(createTicket(dto)).rejects.toMatchObject({ statusCode: 409 });
    await expect(createTicket(dto)).rejects.toBeInstanceOf(AppError);
    expect(insertTicketMock).not.toHaveBeenCalled();
    // lock was never acquired, so it must not be released
    expect(releaseLockMock).not.toHaveBeenCalled();
  });

  it('maps a Postgres unique violation (23505) to a 409 and releases the lock', async () => {
    acquireLockMock.mockResolvedValue(true);
    insertTicketMock.mockRejectedValue({ code: '23505' });

    await expect(createTicket(dto)).rejects.toMatchObject({ statusCode: 409 });
    expect(releaseLockMock).toHaveBeenCalledTimes(1);
  });

  it('rethrows non-unique DB errors and still releases the lock', async () => {
    acquireLockMock.mockResolvedValue(true);
    const dbErr = new Error('connection reset');
    insertTicketMock.mockRejectedValue(dbErr);

    await expect(createTicket(dto)).rejects.toBe(dbErr);
    expect(releaseLockMock).toHaveBeenCalledTimes(1);
  });

  it('does not let a failed lock release mask a successful insert', async () => {
    acquireLockMock.mockResolvedValue(true);
    insertTicketMock.mockResolvedValue(savedTicket);
    releaseLockMock.mockRejectedValue(new Error('redis unlock failed'));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await createTicket(dto);

    expect(result).toBe(savedTicket);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
