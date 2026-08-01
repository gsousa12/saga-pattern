import { ORDER_STATUS_VALUES, OrderStatusEnum } from '@orchestrator/enums';
import { pgTable, uuid, integer, timestamp, real, pgEnum } from 'drizzle-orm/pg-core';

import { products } from './product';

export const orderStatusEnum = pgEnum('order_status', ORDER_STATUS_VALUES);

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  quantity: integer('quantity').notNull(),
  totalPrice: real('total_price').notNull(),
  status: orderStatusEnum('status').default(OrderStatusEnum.PENDING).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type Order = typeof orders.$inferSelect;
export type OrderInsert = typeof orders.$inferInsert;
