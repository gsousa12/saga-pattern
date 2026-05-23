import { pgTable, uuid, varchar, numeric, timestamp } from 'drizzle-orm/pg-core';

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  fromCurrency: varchar('from_currency', { length: 10 }).notNull(),
  toCurrency: varchar('to_currency', { length: 10 }).notNull(),
  amount: numeric('amount', { precision: 18, scale: 8 }).notNull(),
  convertedAmount: numeric('converted_amount', { precision: 18, scale: 8 }).notNull(),
  fees: numeric('fees', { precision: 18, scale: 8 }).notNull(),
  rate: numeric('rate', { precision: 18, scale: 8 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'),
  workflowId: varchar('workflow_id', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
