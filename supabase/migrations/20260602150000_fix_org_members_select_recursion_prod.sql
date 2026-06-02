-- Definitive fix for infinite recursion in organization_members SELECT policy.
--
-- Root cause: the SELECT policy (from 20260601010000) has an OR branch that
-- subqueries organization_members itself. When the INSERT (Send invite) policy's
-- WITH CHECK runs its own subquery against organization_members, it triggers the
-- SELECT policy again → infinite recursion.
--
-- Fix: SELECT policy uses ONLY a direct column comparison (no subqueries).
-- Invited rows (user_id = NULL) are already handled via get_org_invitations() RPC.

DROP POLICY IF EXISTS "members can view memberships" ON public.organization_members;

CREATE POLICY "members can view memberships" ON public.organization_members
FOR SELECT USING (user_id = auth.uid());
