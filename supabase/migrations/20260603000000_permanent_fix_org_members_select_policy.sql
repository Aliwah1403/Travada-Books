-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PERMANENT FIX — DO NOT MODIFY THE SELECT POLICY BELOW                 ║
-- ║                                                                          ║
-- ║  The SELECT policy on organization_members MUST use ONLY:               ║
-- ║    USING (user_id = auth.uid())                                          ║
-- ║                                                                          ║
-- ║  ANY subquery or function call (including my_org_ids()) causes          ║
-- ║  "infinite recursion detected in policy" because the subquery triggers   ║
-- ║  the SELECT policy recursively. This has broken production 4 times.     ║
-- ║                                                                          ║
-- ║  Invited rows (user_id IS NULL) are not visible via direct SELECT.      ║
-- ║  Use the get_org_invitations(org_id) RPC instead.                       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

DROP POLICY IF EXISTS "members can view memberships" ON public.organization_members;

CREATE POLICY "members can view memberships" ON public.organization_members
FOR SELECT USING (user_id = auth.uid());
