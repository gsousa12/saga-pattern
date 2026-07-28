import { pgTable, uuid, integer, timestamp } from "drizzle-orm/pg-core";
import { products } from "./product";

export const batches = pgTable("batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export type BatchEntityType = typeof batches.$inferSelect;
export type CreateBatchType = typeof batches.$inferInsert;
