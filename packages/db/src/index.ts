import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';

import * as schema from './schema';

export async function createDb(connectionString: string) {
  const client = new Client({ connectionString });
  await client.connect();
  return drizzle(client, { schema });
}

export type DbInstance = Awaited<ReturnType<typeof createDb>>;

export * from './schema';
