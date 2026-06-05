-- Fix "Database error deleting user" on auth.admin.deleteUser.
-- Three FK constraints were blocking or conflicting with user deletion:
--
-- 1. organization_members.user_id → auth.users CASCADE conflicted with the SET NULL path
--    via public.users, causing a Postgres tuple-modified conflict.
-- 2. invoices.user_id → auth.users NO ACTION blocked deletion when invoices existed in
--    multi-member orgs (org not deleted, so invoices with user_id survive).
-- 3. quotes.user_id → auth.users NO ACTION — same issue as invoices.
--
-- Fix: drop the conflicting org_members CASCADE FK; change invoices and quotes to SET NULL
-- so the records survive but the deleted user reference is cleared.

ALTER TABLE public.organization_members DROP CONSTRAINT IF EXISTS organization_members_user_id_fkey;

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_user_id_fkey;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_user_id_fkey;
ALTER TABLE public.quotes ADD CONSTRAINT quotes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
