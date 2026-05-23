import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const bu = pgTable('bu', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type BU = typeof bu.$inferSelect;
export type NewBU = typeof bu.$inferInsert;
