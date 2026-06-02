-- Restrict token RPCs to public-safe column projections.
-- SELECT * on SECURITY DEFINER functions exposes internal fields (internal_note,
-- org_id, user_id, etc.) to anyone who calls the RPC directly.
-- Changing return type requires DROP + CREATE (CREATE OR REPLACE cannot change it).
--
-- Columns match what the app already requests via .select() on each public page:
--   invoices  → INVOICE_PUBLIC_SELECT in lib/queries/invoices.ts
--   quotes    → PUBLIC_QUOTE_SELECT   in lib/queries/quotes.ts
-- get_statement_by_token is unchanged — statements have no internal_note field.

-- ── Invoice ──────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_invoice_by_token(text);

CREATE FUNCTION public.get_invoice_by_token(p_token text)
RETURNS TABLE (
  id                uuid,
  token             text,
  invoice_number    text,
  status            text,
  issue_date        date,
  due_date          date,
  currency          text,
  line_items        jsonb,
  subtotal          numeric(15,2),
  tax_amount        numeric(15,2),
  discount          numeric(15,2),
  total             numeric(15,2),
  customer_details  jsonb,
  from_details      jsonb,
  note              text,
  payment_details   text,
  customer_name     text,
  accept_payments   boolean
)
LANGUAGE sql SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    id, token, invoice_number, status, issue_date, due_date, currency,
    line_items, subtotal, tax_amount, discount, total,
    customer_details, from_details, note, payment_details,
    customer_name, accept_payments
  FROM public.invoices
  WHERE token = p_token
    AND status IN ('unpaid', 'paid', 'overdue')
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_invoice_by_token(text) TO anon, authenticated;

-- ── Quote ─────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_quote_by_token(text);

CREATE FUNCTION public.get_quote_by_token(p_token text)
RETURNS TABLE (
  id              uuid,
  created_at      timestamptz,
  updated_at      timestamptz,
  customer_id     uuid,
  customer_name   text,
  token           text,
  quote_number    text,
  status          text,
  issue_date      date,
  valid_until     date,
  currency        text,
  line_items      jsonb,
  subtotal        numeric(15,2),
  tax_amount      numeric(15,2),
  discount        numeric(15,2),
  total           numeric(15,2),
  customer_details jsonb,
  from_details    jsonb,
  note            text,
  sent_at         timestamptz,
  resent_at       timestamptz,
  accepted_at     timestamptz,
  declined_at     timestamptz,
  decline_reason  text,
  viewed_at       timestamptz
)
LANGUAGE sql SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    id, created_at, updated_at, customer_id, customer_name, token,
    quote_number, status, issue_date, valid_until, currency,
    line_items, subtotal, tax_amount, discount, total,
    customer_details, from_details, note,
    sent_at, resent_at, accepted_at, declined_at, decline_reason, viewed_at
  FROM public.quotes
  WHERE token = p_token
    AND status IN ('sent', 'accepted', 'declined', 'expired')
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_quote_by_token(text) TO anon, authenticated;
