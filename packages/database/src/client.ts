import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

const connectionString =
  process.env.DATABASE_URL ?? 'postgres://temporal:temporal@localhost:5432/saga';

const queryClient = postgres(connectionString);

export const db = drizzle(queryClient, { schema });
