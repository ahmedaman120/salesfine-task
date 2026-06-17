import request from 'supertest';
import { createApp } from '../src/app';
import knex from '../src/infra/db/knex';

const app = createApp();

let ticketCounter = 1000; // start high to avoid collisions with seeds

function nextTicketNumber(): number {
  return ++ticketCounter;
}

// No beforeAll connect / afterAll destroy here.
// knex is a shared singleton — destroying it here would break the other suite
// when Jest runs files alphabetically (products before tickets with --runInBand).
// --forceExit owns process-level cleanup for all singletons.

beforeEach(async () => {
  // Truncate tickets table so each test starts clean
  await knex('tickets').truncate();
});

describe('POST /api/tickets', () => {
  it('creates a ticket and returns 201 with the row', async () => {
    const body = {
      ticket_number: nextTicketNumber(),
      subject: 'Login issue',
      description: 'Users cannot log in after the latest deploy.',
    };

    const res = await request(app)
      .post('/api/tickets')
      .send(body)
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      ticket_number: body.ticket_number,
      subject: body.subject,
      description: body.description,
    });
    expect(res.body.data).toHaveProperty('id');
  });

  it('returns 409 when ticket_number already exists', async () => {
    const body = {
      ticket_number: nextTicketNumber(),
      subject: 'Duplicate test',
      description: 'First insert.',
    };

    // First insert — should succeed
    await request(app)
      .post('/api/tickets')
      .send(body)
      .set('Content-Type', 'application/json')
      .expect(201);

    // Second insert with the same ticket_number
    const res = await request(app)
      .post('/api/tickets')
      .send({ ...body, subject: 'Different subject' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when ticket_number is missing', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .send({ subject: 'No number', description: 'Missing ticket_number' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body).toHaveProperty('details');
  });

  it('returns 400 when ticket_number is an empty string', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .send({ ticket_number: '', subject: 'Bad number', description: 'Should fail' })
      .set('Content-Type', 'application/json');

    // Previously z.coerce would accept "" → 0; now it must reject
    expect(res.status).toBe(400);
  });

  it('returns 400 when ticket_number is null', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .send({ ticket_number: null, subject: 'Bad number', description: 'Should fail' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
  });

  it('returns 400 when subject is missing', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .send({ ticket_number: nextTicketNumber(), description: 'No subject' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body.details.some((d: { path: string }) => d.path === 'subject')).toBe(true);
  });

  it('returns 400 when description is missing', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .send({ ticket_number: nextTicketNumber(), subject: 'No description' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body.details.some((d: { path: string }) => d.path === 'description')).toBe(true);
  });

  it('returns 400 when the body is empty', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .send({})
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
  });

  it('concurrency — two simultaneous requests for the same ticket_number result in exactly one 201 and one 409', async () => {
    const ticketNumber = nextTicketNumber();
    const body = {
      ticket_number: ticketNumber,
      subject: 'Race condition test',
      description: 'Two concurrent requests for the same ticket_number.',
    };

    // Fire both requests at the same time
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/tickets')
        .send(body)
        .set('Content-Type', 'application/json'),
      request(app)
        .post('/api/tickets')
        .send(body)
        .set('Content-Type', 'application/json'),
    ]);

    const statuses = [res1.status, res2.status].sort();
    // One must succeed (201) and one must be rejected (409)
    expect(statuses).toEqual([201, 409]);
  });
});
