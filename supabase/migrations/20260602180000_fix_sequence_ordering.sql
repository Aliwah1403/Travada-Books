-- Fix both sequence functions to order by the numeric suffix of the number
-- rather than created_at. The created_at approach breaks when rows are
-- inserted in bulk (same timestamp) or when numbers don't sort chronologically.

CREATE OR REPLACE FUNCTION "public"."next_invoice_number"("p_org_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  last_number text;
  prefix      text;
  digits      text;
  next_num    bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(('x' || substr(md5(p_org_id::text), 1, 16))::bit(64)::bigint);

  SELECT invoice_number
    INTO last_number
    FROM public.invoices
   WHERE org_id = p_org_id
     AND invoice_number IS NOT NULL
     AND invoice_number ~ '\d+$'
   ORDER BY CAST(SUBSTRING(invoice_number FROM '\d+$') AS BIGINT) DESC
   LIMIT 1;

  IF last_number IS NULL THEN
    RETURN 'INV-0001';
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
     AND quote_number ~ '\d+$'
   ORDER BY CAST(SUBSTRING(quote_number FROM '\d+$') AS BIGINT) DESC
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
