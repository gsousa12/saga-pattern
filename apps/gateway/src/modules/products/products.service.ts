import { Injectable } from '@nestjs/common';
import { createDb, products } from '@orchestrator/db';
import { eq, isNull } from 'drizzle-orm';

let dbPromise: ReturnType<typeof createDb> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = createDb(
      process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/orchestrator',
    );
  }
  return dbPromise;
}

@Injectable()
export class ProductsService {
  async findAll() {
    const db = await getDb();
    const result = await db.select().from(products).where(isNull(products.deletedAt));

    return result;
  }

  async findOne(id: string) {
    const db = await getDb();
    const [result] = await db.select().from(products).where(eq(products.id, id));
    return result || null;
  }
}
