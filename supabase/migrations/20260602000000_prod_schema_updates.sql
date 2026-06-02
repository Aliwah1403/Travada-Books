-- Production schema updates.
-- Adds objects required by the current app code that were not in the initial
-- remote schema pull. Safe to apply to production — does not touch the
-- organization_members SELECT policy (production version with my_org_ids() works fine).

-- ── Public token RPCs ─────────────────────────────────────────────────────────
-- Used by public invoice/quote/statement pages instead of direct table selects.

CREATE OR REPLACE FUNCTION public.get_invoice_by_token(p_token text)
RETURNS SETOF public.invoices
LANGUAGE sql SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM public.invoices WHERE token = p_token LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_quote_by_token(p_token text)
RETURNS SETOF public.quotes
LANGUAGE sql SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM public.quotes WHERE token = p_token AND status = 'sent' LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_statement_by_token(p_token text)
RETURNS SETOF public.statements
LANGUAGE sql SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM public.statements WHERE token = p_token LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_invoice_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_quote_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_statement_by_token(text) TO anon, authenticated;

-- ── Team page RPCs ────────────────────────────────────────────────────────────
-- Used by the Team settings page to list members and invitations.
-- SECURITY DEFINER so they can see all org rows without RLS filtering.
-- The EXISTS check ensures callers can only see their own org's data.

CREATE OR REPLACE FUNCTION public.get_org_members(p_org_id uuid)
RETURNS TABLE(
  id          uuid,
  user_id     uuid,
  org_id      uuid,
  role        text,
  status      text,
  email       text,
  created_at  timestamptz,
  expires_at  timestamptz,
  full_name   text,
  avatar_url  text,
  user_email  text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    om.id, om.user_id, om.org_id, om.role, om.status, om.email,
    om.created_at, om.expires_at,
    u.full_name, u.avatar_url, u.email AS user_email
  FROM public.organization_members om
  LEFT JOIN public.users u ON u.id = om.user_id
  WHERE om.org_id = p_org_id
    AND EXISTS (
      SELECT 1 FROM public.organization_members me
      WHERE me.org_id = p_org_id
        AND me.user_id = auth.uid()
        AND me.status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION public.get_org_invitations(p_org_id uuid)
RETURNS TABLE(
  id         uuid,
  email      text,
  role       text,
  created_at timestamptz,
  expires_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT om.id, om.email, om.role, om.created_at, om.expires_at
  FROM public.organization_members om
  WHERE om.org_id = p_org_id
    AND om.status = 'invited'
    AND EXISTS (
      SELECT 1 FROM public.organization_members me
      WHERE me.org_id = p_org_id
        AND me.user_id = auth.uid()
        AND me.role = 'owner'
        AND me.status = 'active'
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_org_members(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_invitations(uuid) TO authenticated;

-- ── organization_members UPDATE policy ───────────────────────────────────────
-- Allows org owners to change member roles and renew invitations.
-- Was missing from the initial schema — updateMemberRole and renewInvitation
-- were silently returning 0 rows updated without this.

DROP POLICY IF EXISTS "org owners can update memberships" ON public.organization_members;

CREATE POLICY "org owners can update memberships" ON public.organization_members
FOR UPDATE TO authenticated
USING (
  org_id IN (
    SELECT org_id FROM public.organization_members
    WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'
  )
)
WITH CHECK (
  org_id IN (
    SELECT org_id FROM public.organization_members
    WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'
  )
);

-- ── organization_members DELETE policy (replace) ──────────────────────────────
-- Fixes the existing DELETE policy to also handle invited rows (user_id = null),
-- which the original policy missed — revokeInvitation was silently failing.

DROP POLICY IF EXISTS "members can delete memberships" ON public.organization_members;

CREATE POLICY "members can delete memberships" ON public.organization_members
FOR DELETE USING (
  -- user leaving their own non-owner row
  (user_id = auth.uid() AND role <> 'owner')
  OR
  -- org owner removing another member or revoking an invitation
  (
    org_id IN (
      SELECT org_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'
    )
    AND (user_id IS NULL OR user_id <> auth.uid())
    AND role <> 'owner'
  )
);
