import knex from '../../infra/db/knex';
import { CreateTicketDto } from './tickets.schema';

export interface Ticket extends CreateTicketDto {
  id: number;
  created_at: Date;
  updated_at: Date;
}

export async function insertTicket(dto: CreateTicketDto): Promise<Ticket> {
  const [row] = await knex<Ticket>('tickets').insert(dto).returning('*');
  return row;
}
