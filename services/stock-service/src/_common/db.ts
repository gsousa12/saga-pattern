import { createDb, type DbInstance } from '@orchestrator/db';

let dbInstance: Promise<DbInstance> | null = null;

export function getDbInstance(): Promise<DbInstance> {
  if (!dbInstance) {
    dbInstance = createDb(
      process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/orchestrator',
    );
  }
  return dbInstance;
}
