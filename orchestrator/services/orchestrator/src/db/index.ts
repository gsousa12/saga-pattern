import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import * as schema from './schema';

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/orchestrator',
});

export async function connectDb() {
  await client.connect();
  return drizzle(client, { schema });
}

export const db = drizzle(client, { schema });
