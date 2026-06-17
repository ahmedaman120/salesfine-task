jest.mock('../../src/modules/tickets/tickets.service', () => ({
  createTicket: jest.fn(),
}));

import { Request, Response } from 'express';
import { submitTicket } from '../../src/modules/tickets/tickets.controller';
import { createTicket } from '../../src/modules/tickets/tickets.service';

const createTicketMock = createTicket as jest.Mock;

function mockRes(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('submitTicket', () => {
  it('creates the ticket and responds 201 with { data }', async () => {
    const body = { ticket_number: 7, subject: 's', description: 'd' };
    const saved = { id: 1, ...body };
    createTicketMock.mockResolvedValue(saved);

    const req = { body } as Request;
    const res = mockRes();

    await submitTicket(req, res);

    expect(createTicketMock).toHaveBeenCalledWith(body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ data: saved });
  });

  it('propagates service errors (handled upstream by asyncHandler)', async () => {
    const err = new Error('service failed');
    createTicketMock.mockRejectedValue(err);

    const req = { body: {} } as Request;
    const res = mockRes();

    await expect(submitTicket(req, res)).rejects.toBe(err);
    expect(res.status).not.toHaveBeenCalled();
  });
});
