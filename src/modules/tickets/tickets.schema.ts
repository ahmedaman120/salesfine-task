import { z } from 'zod';

export const createTicketSchema = z.object({
  // z.number() (no coerce) — express.json() already parses the body so a JSON
  // number arrives as a JS number. Coercion would silently accept "" → 0 and
  // null → 0, both of which must be rejected as missing / invalid.
  ticket_number: z
    .number({
      required_error: 'ticket_number is required',
      invalid_type_error: 'ticket_number must be an integer',
    })
    .int('ticket_number must be an integer'),

  subject: z
    .string({ required_error: 'subject is required' })
    .min(1, 'subject cannot be empty'),

  description: z
    .string({ required_error: 'description is required' })
    .min(1, 'description cannot be empty'),
});

export type CreateTicketDto = z.infer<typeof createTicketSchema>;
