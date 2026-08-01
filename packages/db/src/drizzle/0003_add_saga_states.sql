CREATE TYPE "saga_type" AS ENUM ('checkout_process');
CREATE TYPE "saga_step" AS ENUM ('pending_stock', 'pending_payment', 'completed', 'rollbacking_stock');

CREATE TABLE IF NOT EXISTS "saga_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"business_id" uuid NOT NULL,
	"type" "saga_type" DEFAULT 'checkout_process' NOT NULL,
	"current_step" "saga_step" DEFAULT 'pending_stock' NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saga_states_idempotency_key_unique" UNIQUE("idempotency_key")
);
