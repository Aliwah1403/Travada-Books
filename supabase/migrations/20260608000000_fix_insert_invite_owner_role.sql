-- Fix: org owners can invite at any role, including owner.
--
-- The previous INSERT policy had `role <> 'owner'` in the invitation branch,
-- which blocked inviting someone directly as an owner. Since teams support
-- multiple owners, active owners should be able to invite at any role.

DROP POLICY IF EXISTS "members can insert memberships" ON public.organization_members;

CREATE POLICY "members can insert memberships" ON public.organization_members
FOR INSERT TO authenticated WITH CHECK (
  -- self-bootstrap: only as owner of a brand new org with no existing members
  (
    user_id = auth.uid()
    AND role = 'owner'
    AND NOT EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.org_id = organization_members.org_id
    )
  )
  OR
  -- invitations: active owners can invite at any role
  (
    user_id IS NULL
    AND org_id IN (
      SELECT om2.org_id FROM public.organization_members om2
      WHERE om2.user_id = auth.uid()
        AND om2.role = 'owner'
        AND om2.status = 'active'
    )
  )
);
