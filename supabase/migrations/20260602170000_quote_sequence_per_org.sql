-- Change quote number sequencing from per-customer to per-org, matching invoice behaviour.

-- Per-org sequence function
CREATE OR REPLACE FUNCTION "public"."next_quote_number"("p_org_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  last_number text;
  prefix      text;
  digits      text;
  next_num    bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(('x' || substr(md5('quote_' || p_org_id::text), 1, 16))::bit(64)::bigint);

  SELECT quote_number
    INTO last_number
    FROM public.quotes
   WHERE org_id = p_org_id
     AND quote_number IS NOT NULL
   ORDER BY created_at DESC
   LIMIT 1;

  IF last_number IS NULL THEN
    RETURN 'QUO-0001';
  END IF;

  SELECT (regexp_match(last_number, '^(.*?)(\d+)$'))[1],
         (regexp_match(last_number, '^(.*?)(\d+)$'))[2]
    INTO prefix, digits;

  IF digits IS NULL THEN
    RETURN last_number || '-0001';
  END IF;

  next_num := digits::bigint + 1;
  RETURN prefix || lpad(next_num::text, length(digits), '0');
END;
$_$;

GRANT ALL ON FUNCTION "public"."next_quote_number"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."next_quote_number"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."next_quote_number"("p_org_id" "uuid") TO "service_role";

-- Drop the per-customer overload
DROP FUNCTION IF EXISTS "public"."next_quote_number"("p_org_id" "uuid", "p_customer_id" "uuid");

-- Per-org unique index (quotes had no unique index before, adding one now)
CREATE UNIQUE INDEX "quotes_org_quote_number_unique"
  ON "public"."quotes" ("org_id", "quote_number")
  WHERE "quote_number" IS NOT NULL AND "quote_number" <> '';
