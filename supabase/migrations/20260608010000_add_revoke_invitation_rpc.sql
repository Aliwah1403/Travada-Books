-- SECURITY DEFINER so it can delete invite rows (user_id IS NULL)
-- without hitting the SELECT policy that blocks NULL user_id rows.
CREATE OR REPLACE FUNCTION public.revoke_invitation(invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  -- Fetch the org this invite belongs to
  SELECT org_id INTO v_org_id
  FROM organization_members
  WHERE id = invitation_id AND user_id IS NULL;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  -- Caller must be an active member of that org
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = v_org_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM organization_members
  WHERE id = invitation_id AND user_id IS NULL;
END;
$$;
