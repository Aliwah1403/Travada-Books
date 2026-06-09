-- Add active_org_id to track which org is currently active for a user.
-- Enables multi-org per user: switching orgs persists across devices/browsers.
ALTER TABLE public.users
  ADD COLUMN active_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Bootstrap existing users: point to their first active membership by join date.
UPDATE public.users u
SET active_org_id = (
  SELECT om.org_id
  FROM public.organization_members om
  WHERE om.user_id = u.id
    AND om.status = 'active'
  ORDER BY om.created_at ASC
  LIMIT 1
)
WHERE u.active_org_id IS NULL;
