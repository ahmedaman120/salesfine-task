import { Request, Response } from 'express';
import { createTicket } from './tickets.service';
import { CreateTicketDto } from './tickets.schema';

export async function submitTicket(
  req: Request,
  res: Response,
): Promise<void> {
  // req.body is already validated and coerced by the validate middleware
  const ticket = await createTicket(req.body as CreateTicketDto);
  res.status(201).json({ data: ticket });
}
