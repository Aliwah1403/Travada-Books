-- Change invoice number uniqueness from per-customer to per-org.
-- Drop the old per-customer partial unique index and replace it with a per-org one.
-- Also drop the per-customer overload of next_invoice_number since it is no longer needed.

DROP INDEX IF EXISTS "public"."invoices_customer_invoice_number_unique";

CREATE UNIQUE INDEX "invoices_org_invoice_number_unique"
  ON "public"."invoices" ("org_id", "invoice_number")
  WHERE "invoice_number" IS NOT NULL AND "invoice_number" <> '';

DROP FUNCTION IF EXISTS "public"."next_invoice_number"("p_org_id" "uuid", "p_customer_id" "uuid");
