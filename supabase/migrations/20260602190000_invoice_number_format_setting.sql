-- Add invoice number format columns to invoice_templates.
-- prefix  = the text before the digits (e.g. 'INV-', 'ARIA-')
-- digits  = how many zero-padded digit places (e.g. 4 → 0001)
-- These are used by next_invoice_number as the fallback when the org has no
-- invoices yet.  Existing invoice sequences keep working because the function
-- only reads these columns when last_number IS NULL.

ALTER TABLE public.invoice_templates
  ADD COLUMN IF NOT EXISTS invoice_number_prefix text    DEFAULT 'INV-',
  ADD COLUMN IF NOT EXISTS invoice_number_digits  integer DEFAULT 4;

-- Update next_invoice_number to read the template settings when the org has
-- no invoices yet, instead of hardcoding 'INV-0001'.
CREATE OR REPLACE FUNCTION "public"."next_invoice_number"("p_org_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  last_number  text;
  prefix       text;
  digits       text;
  next_num     bigint;
  tmpl_prefix  text;
  tmpl_digits  int;
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
    SELECT COALESCE(invoice_number_prefix, 'INV-'),
           COALESCE(invoice_number_digits, 4)
      INTO tmpl_prefix, tmpl_digits
      FROM public.invoice_templates
     WHERE org_id = p_org_id
       AND is_default = true
     LIMIT 1;

    RETURN COALESCE(tmpl_prefix, 'INV-') || lpad('1', COALESCE(tmpl_digits, 4), '0');
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
