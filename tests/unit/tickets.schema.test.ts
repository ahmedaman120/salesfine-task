import { createTicketSchema } from '../../src/modules/tickets/tickets.schema';

describe('createTicketSchema', () => {
  const valid = {
    ticket_number: 42,
    subject: 'Login issue',
    description: 'Cannot log in.',
  };

  it('accepts a well-formed payload', () => {
    const result = createTicketSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual(valid);
  });

  it('rejects a missing ticket_number', () => {
    const result = createTicketSchema.safeParse({
      subject: 'x',
      description: 'y',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty-string ticket_number (no coercion to 0)', () => {
    const result = createTicketSchema.safeParse({ ...valid, ticket_number: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a null ticket_number', () => {
    const result = createTicketSchema.safeParse({
      ...valid,
      ticket_number: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-integer ticket_number', () => {
    const result = createTicketSchema.safeParse({
      ...valid,
      ticket_number: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a numeric string ticket_number (must be a JSON number)', () => {
    const result = createTicketSchema.safeParse({
      ...valid,
      ticket_number: '42',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty subject', () => {
    const result = createTicketSchema.safeParse({ ...valid, subject: '' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty description', () => {
    const result = createTicketSchema.safeParse({ ...valid, description: '' });
    expect(result.success).toBe(false);
  });
});
