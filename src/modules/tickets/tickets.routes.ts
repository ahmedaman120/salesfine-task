import { Router } from 'express';
import { asyncHandler } from '../../core/async-handler';
import { validate } from '../../core/middleware/validate';
import { submitTicket } from './tickets.controller';
import { createTicketSchema } from './tickets.schema';

export const ticketsRouter = Router();

ticketsRouter.post('/', validate(createTicketSchema), asyncHandler(submitTicket));
