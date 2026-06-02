-- Add advisory locks to all numbering functions to prevent race conditions
-- when two concurrent transactions read the same "last number" before either
-- has inserted the new row. pg_advisory_xact_lock is transaction-scoped so
-- the lock is released automatically at commit/rollback.

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
   ORDER BY created_at DESC
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


CREATE OR REPLACE FUNCTION "public"."next_invoice_number"("p_org_id" "uuid", "p_customer_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  last_number text;
  prefix      text;
  digits      text;
  next_num    bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(('x' || substr(md5(p_org_id::text || p_customer_id::text), 1, 16))::bit(64)::bigint);

  SELECT invoice_number
    INTO last_number
    FROM public.invoices
   WHERE org_id = p_org_id
     AND customer_id = p_customer_id
     AND invoice_number IS NOT NULL
   ORDER BY created_at DESC
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


CREATE OR REPLACE FUNCTION "public"."next_quote_number"("p_org_id" "uuid", "p_customer_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
  last_num int;
BEGIN
  PERFORM pg_advisory_xact_lock(('x' || substr(md5(p_org_id::text || p_customer_id::text), 1, 16))::bit(64)::bigint);

  SELECT COALESCE(
    MAX(
      CAST(
        NULLIF(regexp_replace(quote_number, '^QUO-0*', ''), '') AS int
      )
    ), 0
  )
  INTO last_num
  FROM quotes
  WHERE org_id = p_org_id
    AND customer_id = p_customer_id
    AND quote_number ~ '^QUO-\d+$';

  RETURN 'QUO-' || LPAD((last_num + 1)::text, 4, '0');
END;
$_$;
