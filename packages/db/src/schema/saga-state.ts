import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import {
  SAGA_TYPE_VALUES,
  SagaTypeEnum,
  SAGA_STEP_VALUES,
  SagaStepEnum,
} from "@orchestrator/enums";

export const sagaTypeEnum = pgEnum("saga_type", SAGA_TYPE_VALUES);
export const sagaStepEnum = pgEnum("saga_step", SAGA_STEP_VALUES);

export const sagaStates = pgTable("saga_states", {
  id: uuid("id").defaultRandom().primaryKey(),
  idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull().unique(),
  businessId: uuid("business_id").notNull(),
  type: sagaTypeEnum("type").default(SagaTypeEnum.CHECKOUT_PROCESS).notNull(),
  currentStep: sagaStepEnum("current_step")
    .default(SagaStepEnum.PENDING_STOCK)
    .notNull(),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type SagaState = typeof sagaStates.$inferSelect;
export type SagaStateInsert = typeof sagaStates.$inferInsert;
