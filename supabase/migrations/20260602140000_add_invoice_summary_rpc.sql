-- Fresh-rate invoice summary for KPI cards.
-- Computes open/overdue/paid totals by looking up current exchange rates at
-- query time rather than relying on the stored converted_amount column, so
-- old rows with null converted_amount are correctly included.
-- Invoices in a currency with no rate in exchange_rates are excluded from the
-- total (avoids silently mixing currencies) — same behaviour as Midday.

CREATE OR REPLACE FUNCTION public.get_invoice_summary(
  p_org_id   uuid,
  p_statuses text[]
)
RETURNS TABLE (
  total_amount   numeric,
  invoice_count  integer,
  currency       text
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_base_currency text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = p_org_id AND user_id = auth.uid() AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT base_currency INTO v_base_currency
  FROM organizations WHERE id = p_org_id;

  v_base_currency := COALESCE(v_base_currency, 'KES');

  RETURN QUERY
  WITH inv AS (
    SELECT i.total, i.currency
    FROM invoices i
    WHERE i.org_id = p_org_id
      AND i.status = ANY(p_statuses)
      AND i.total IS NOT NULL
  ),
  converted AS (
    SELECT
      CASE
        WHEN inv.currency = v_base_currency THEN inv.total
        ELSE inv.total * (
          SELECT er.rate FROM exchange_rates er
          WHERE er.base = inv.currency AND er.target = v_base_currency
          LIMIT 1
        )
      END AS amount
    FROM inv
  )
  SELECT
    ROUND(COALESCE(SUM(c.amount), 0)::numeric, 2),
    COUNT(*)::integer,
    v_base_currency
  FROM converted c
  WHERE c.amount IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_invoice_summary(uuid, text[]) TO authenticated;
