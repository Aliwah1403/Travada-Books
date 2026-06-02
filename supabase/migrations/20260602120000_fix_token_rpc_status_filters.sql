-- Fix token RPC status filters for consistency.
--
-- get_quote_by_token: was filtering to status='sent' only, but the public
-- quote page renders accepted/declined/expired states too — those would
-- return no rows and show "Quote not found". Expand to all public statuses.
--
-- get_invoice_by_token: had no status filter. Invoices only receive a token
-- when sent, but an explicit filter prevents edge-case draft exposure.
--
-- get_statement_by_token: unchanged — statements have no draft state.

CREATE OR REPLACE FUNCTION public.get_invoice_by_token(p_token text)
RETURNS SETOF public.invoices
LANGUAGE sql SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM public.invoices
  WHERE token = p_token
    AND status IN ('unpaid', 'paid', 'overdue')
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_quote_by_token(p_token text)
RETURNS SETOF public.quotes
LANGUAGE sql SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM public.quotes
  WHERE token = p_token
    AND status IN ('sent', 'accepted', 'declined', 'expired')
  LIMIT 1;
$$;
