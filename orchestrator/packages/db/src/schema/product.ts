import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  real,
} from "drizzle-orm/pg-core";

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  price: real("price").notNull(),
  description: varchar("description", { length: 500 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
