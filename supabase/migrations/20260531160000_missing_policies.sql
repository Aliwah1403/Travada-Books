-- Drop and recreate ALL policies to exactly match production state.
-- This is the authoritative final policy state for local dev.

-- Recreate my_org_ids() with row_security = off to prevent infinite recursion
-- in RLS policies. Local Supabase forces row_security = on even for superusers,
-- so we must explicitly disable it at the function level.
CREATE OR REPLACE FUNCTION public.my_org_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
$$;
ALTER FUNCTION public.my_org_ids() OWNER TO postgres;

-- ── customers ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "members can delete customers" ON public.customers;
DROP POLICY IF EXISTS "members can insert customers" ON public.customers;
DROP POLICY IF EXISTS "members can update customers" ON public.customers;
DROP POLICY IF EXISTS "members can view customers" ON public.customers;

CREATE POLICY "members can delete customers" ON public.customers FOR DELETE USING (org_id IN (SELECT my_org_ids()));
CREATE POLICY "members can insert customers" ON public.customers FOR INSERT WITH CHECK (org_id IN (SELECT my_org_ids()));
CREATE POLICY "members can update customers" ON public.customers FOR UPDATE USING (org_id IN (SELECT my_org_ids()));
CREATE POLICY "members can view customers" ON public.customers FOR SELECT USING (org_id IN (SELECT my_org_ids()));

-- ── invoice_recurring ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "org members can create recurring series" ON public.invoice_recurring;
DROP POLICY IF EXISTS "org members can update recurring series" ON public.invoice_recurring;
DROP POLICY IF EXISTS "org members can view recurring series" ON public.invoice_recurring;
DROP POLICY IF EXISTS "service role full access to recurring series" ON public.invoice_recurring;

CREATE POLICY "org members can create recurring series" ON public.invoice_recurring FOR INSERT WITH CHECK (
  org_id IN (SELECT organization_members.org_id FROM public.organization_members WHERE organization_members.user_id = auth.uid() AND organization_members.status = 'active')
);
CREATE POLICY "org members can update recurring series" ON public.invoice_recurring FOR UPDATE USING (
  org_id IN (SELECT organization_members.org_id FROM public.organization_members WHERE organization_members.user_id = auth.uid() AND organization_members.status = 'active')
);
CREATE POLICY "org members can view recurring series" ON public.invoice_recurring FOR SELECT USING (
  org_id IN (SELECT organization_members.org_id FROM public.organization_members WHERE organization_members.user_id = auth.uid() AND organization_members.status = 'active')
);
CREATE POLICY "service role full access to recurring series" ON public.invoice_recurring FOR ALL USING (auth.role() = 'service_role');

-- ── invoice_send_templates ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Org members can manage their templates" ON public.invoice_send_templates;
DROP POLICY IF EXISTS "Org members can read their templates" ON public.invoice_send_templates;
DROP POLICY IF EXISTS "System templates are publicly readable" ON public.invoice_send_templates;

CREATE POLICY "Org members can manage their templates" ON public.invoice_send_templates FOR ALL USING (
  org_id IS NOT NULL AND org_id IN (SELECT organization_members.org_id FROM public.organization_members WHERE organization_members.user_id = auth.uid())
);
CREATE POLICY "Org members can read their templates" ON public.invoice_send_templates FOR SELECT USING (
  org_id IS NOT NULL AND org_id IN (SELECT organization_members.org_id FROM public.organization_members WHERE organization_members.user_id = auth.uid())
);
CREATE POLICY "System templates are publicly readable" ON public.invoice_send_templates FOR SELECT USING (org_id IS NULL);

-- ── invoice_templates ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "members can delete invoice templates" ON public.invoice_templates;
DROP POLICY IF EXISTS "members can insert invoice templates" ON public.invoice_templates;
DROP POLICY IF EXISTS "members can update invoice templates" ON public.invoice_templates;
DROP POLICY IF EXISTS "members can view invoice templates" ON public.invoice_templates;

CREATE POLICY "members can delete invoice templates" ON public.invoice_templates FOR DELETE USING (org_id IN (SELECT my_org_ids()));
CREATE POLICY "members can insert invoice templates" ON public.invoice_templates FOR INSERT WITH CHECK (org_id IN (SELECT my_org_ids()));
CREATE POLICY "members can update invoice templates" ON public.invoice_templates FOR UPDATE USING (org_id IN (SELECT my_org_ids()));
CREATE POLICY "members can view invoice templates" ON public.invoice_templates FOR SELECT USING (org_id IN (SELECT my_org_ids()));

-- ── invoices ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "members can delete invoices" ON public.invoices;
DROP POLICY IF EXISTS "members can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "members can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "members can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "public can view invoice by token" ON public.invoices;

CREATE POLICY "members can delete invoices" ON public.invoices FOR DELETE USING (org_id IN (SELECT my_org_ids()));
CREATE POLICY "members can insert invoices" ON public.invoices FOR INSERT WITH CHECK (org_id IN (SELECT my_org_ids()));
CREATE POLICY "members can update invoices" ON public.invoices FOR UPDATE USING (org_id IN (SELECT my_org_ids()));
CREATE POLICY "members can view invoices" ON public.invoices FOR SELECT USING (org_id IN (SELECT my_org_ids()));

-- ── organization_members ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "members can delete memberships" ON public.organization_members;
DROP POLICY IF EXISTS "members can insert memberships" ON public.organization_members;
DROP POLICY IF EXISTS "members can view memberships" ON public.organization_members;

CREATE POLICY "members can delete memberships" ON public.organization_members FOR DELETE USING (
  ((user_id = auth.uid()) AND ((role <> 'owner') OR (
    (SELECT count(*) FROM public.organization_members om WHERE om.org_id = organization_members.org_id AND om.role = 'owner' AND om.status = 'active') > 1
  )))
  OR (
    org_id IN (SELECT om2.org_id FROM public.organization_members om2 WHERE om2.user_id = auth.uid() AND om2.role = 'owner' AND om2.status = 'active')
    AND user_id <> auth.uid()
    AND role <> 'owner'
  )
);
CREATE POLICY "members can insert memberships" ON public.organization_members FOR INSERT TO authenticated WITH CHECK (
  -- self-bootstrap: only as owner of a brand new org with no existing members
  (user_id = auth.uid() AND role = 'owner' AND NOT EXISTS (SELECT 1 FROM public.organization_members om WHERE om.org_id = organization_members.org_id))
  OR
  -- invitations: only active owners can invite, and only at non-owner roles
  (user_id IS NULL AND role <> 'owner' AND org_id IN (
    SELECT om2.org_id FROM public.organization_members om2
    WHERE om2.user_id = auth.uid() AND om2.role = 'owner' AND om2.status = 'active'
  ))
);
CREATE POLICY "members can view memberships" ON public.organization_members FOR SELECT USING (org_id IN (SELECT my_org_ids()));

-- ── organizations ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated users can create orgs" ON public.organizations;
DROP POLICY IF EXISTS "members can update their orgs" ON public.organizations;
DROP POLICY IF EXISTS "members can view their orgs" ON public.organizations;

CREATE POLICY "authenticated users can create orgs" ON public.organizations FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "members can update their orgs" ON public.organizations FOR UPDATE USING (id IN (SELECT my_org_ids()));
CREATE POLICY "members can view their orgs" ON public.organizations FOR SELECT USING (id IN (SELECT my_org_ids()));

-- ── quotes ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "org members can delete quotes" ON public.quotes;
DROP POLICY IF EXISTS "org members can insert quotes" ON public.quotes;
DROP POLICY IF EXISTS "org members can select quotes" ON public.quotes;
DROP POLICY IF EXISTS "org members can update quotes" ON public.quotes;
DROP POLICY IF EXISTS "public can view quote by token" ON public.quotes;

CREATE POLICY "org members can delete quotes" ON public.quotes FOR DELETE USING (
  org_id IN (SELECT organization_members.org_id FROM public.organization_members WHERE organization_members.user_id = auth.uid())
);
CREATE POLICY "org members can insert quotes" ON public.quotes FOR INSERT WITH CHECK (
  org_id IN (SELECT organization_members.org_id FROM public.organization_members WHERE organization_members.user_id = auth.uid())
);
CREATE POLICY "org members can select quotes" ON public.quotes FOR SELECT USING (org_id IN (SELECT my_org_ids()));
CREATE POLICY "org members can update quotes" ON public.quotes FOR UPDATE USING (
  org_id IN (SELECT organization_members.org_id FROM public.organization_members WHERE organization_members.user_id = auth.uid())
);

-- ── statements ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "members can manage statements" ON public.statements;
DROP POLICY IF EXISTS "public can view statement by token" ON public.statements;

CREATE POLICY "members can manage statements" ON public.statements FOR ALL USING (
  org_id IN (SELECT organization_members.org_id FROM public.organization_members WHERE organization_members.user_id = auth.uid())
) WITH CHECK (
  org_id IN (SELECT organization_members.org_id FROM public.organization_members WHERE organization_members.user_id = auth.uid())
);

-- ── users ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "org members can view each other" ON public.users;
DROP POLICY IF EXISTS "users can update own profile" ON public.users;
DROP POLICY IF EXISTS "users can view own profile" ON public.users;

CREATE POLICY "org members can view each other" ON public.users FOR SELECT USING (
  id IN (
    SELECT om2.user_id FROM public.organization_members om1
    JOIN public.organization_members om2 ON om2.org_id = om1.org_id
    WHERE om1.user_id = auth.uid() AND om1.status = 'active' AND om2.status = 'active'
  )
);
CREATE POLICY "users can update own profile" ON public.users FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "users can view own profile" ON public.users FOR SELECT USING (id = auth.uid());

-- ── storage.objects ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Org members can delete org assets" ON storage.objects;
DROP POLICY IF EXISTS "Org members can update org assets" ON storage.objects;
DROP POLICY IF EXISTS "Org members can upload org assets" ON storage.objects;
DROP POLICY IF EXISTS "Public can read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public can read org assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;

CREATE POLICY "Public can read org assets" ON storage.objects FOR SELECT USING (bucket_id = 'org-assets');
CREATE POLICY "Org members can upload org assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'org-assets'
  AND (storage.foldername(name))[1] = 'logos'
  AND EXISTS (SELECT 1 FROM public.organization_members WHERE (organization_members.org_id)::text = (storage.foldername(objects.name))[2] AND organization_members.user_id = auth.uid() AND organization_members.status = 'active')
);
CREATE POLICY "Org members can update org assets" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'org-assets'
  AND (storage.foldername(name))[1] = 'logos'
  AND EXISTS (SELECT 1 FROM public.organization_members WHERE (organization_members.org_id)::text = (storage.foldername(objects.name))[2] AND organization_members.user_id = auth.uid() AND organization_members.status = 'active')
);
CREATE POLICY "Org members can delete org assets" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'org-assets'
  AND (storage.foldername(name))[1] = 'logos'
  AND EXISTS (SELECT 1 FROM public.organization_members WHERE (organization_members.org_id)::text = (storage.foldername(objects.name))[2] AND organization_members.user_id = auth.uid() AND organization_members.status = 'active')
);
CREATE POLICY "Public can read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'avatars' AND (storage.foldername(name))[1] = (auth.uid())::text
);
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'avatars' AND (storage.foldername(name))[1] = (auth.uid())::text
);
CREATE POLICY "Users can delete own avatar" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'avatars' AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- ── triggers ─────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS invoices_updated_at ON public.invoices;
CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS quotes_updated_at ON public.quotes;
CREATE TRIGGER quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_quotes_updated_at();
