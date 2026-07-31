ALTER TABLE "batches" RENAME TO "stock";
ALTER TABLE "stock" RENAME COLUMN "quantity" TO "available_quantity";
ALTER TABLE "stock" ADD COLUMN "reserved_quantity" integer DEFAULT 0 NOT NULL;
