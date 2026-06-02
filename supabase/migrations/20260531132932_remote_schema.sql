drop extension if exists "pg_net";

create extension if not exists "pg_net" with schema "public";

drop trigger if exists "invoices_updated_at" on "public"."invoices";

drop trigger if exists "quotes_updated_at" on "public"."quotes";

drop policy "public can view invoice by token" on "public"."invoices";

drop policy "public can view statement by token" on "public"."statements";

drop policy "members can delete customers" on "public"."customers";

drop policy "members can insert customers" on "public"."customers";

drop policy "members can update customers" on "public"."customers";

drop policy "members can view customers" on "public"."customers";

drop policy "org members can create recurring series" on "public"."invoice_recurring";

drop policy "org members can update recurring series" on "public"."invoice_recurring";

drop policy "org members can view recurring series" on "public"."invoice_recurring";

drop policy "Org members can manage their templates" on "public"."invoice_send_templates";

drop policy "Org members can read their templates" on "public"."invoice_send_templates";

drop policy "members can delete invoice templates" on "public"."invoice_templates";

drop policy "members can insert invoice templates" on "public"."invoice_templates";

drop policy "members can update invoice templates" on "public"."invoice_templates";

drop policy "members can view invoice templates" on "public"."invoice_templates";

drop policy "members can delete invoices" on "public"."invoices";

drop policy "members can insert invoices" on "public"."invoices";

drop policy "members can update invoices" on "public"."invoices";

drop policy "members can view invoices" on "public"."invoices";

drop policy "members can delete memberships" on "public"."organization_members";

drop policy "members can insert memberships" on "public"."organization_members";

drop policy "members can view memberships" on "public"."organization_members";

drop policy "members can update their orgs" on "public"."organizations";

drop policy "members can view their orgs" on "public"."organizations";

drop policy "org members can delete quotes" on "public"."quotes";

drop policy "org members can insert quotes" on "public"."quotes";

drop policy "org members can select quotes" on "public"."quotes";

drop policy "org members can update quotes" on "public"."quotes";

drop policy "members can manage statements" on "public"."statements";

drop policy "org members can view each other" on "public"."users";

alter table "public"."customers" drop constraint "customers_org_id_fkey";

alter table "public"."invoice_recurring" drop constraint "invoice_recurring_customer_id_fkey";

alter table "public"."invoice_recurring" drop constraint "invoice_recurring_org_id_fkey";

alter table "public"."invoice_send_templates" drop constraint "invoice_send_templates_org_id_fkey";

alter table "public"."invoice_templates" drop constraint "invoice_templates_org_id_fkey";

alter table "public"."invoices" drop constraint "invoices_customer_id_fkey";

alter table "public"."invoices" drop constraint "invoices_invoice_recurring_id_fkey";

alter table "public"."invoices" drop constraint "invoices_org_id_fkey";

alter table "public"."invoices" drop constraint "invoices_quote_id_fkey";

alter table "public"."invoices" drop constraint "invoices_send_template_id_fkey";

alter table "public"."organization_members" drop constraint "organization_members_org_id_fkey";

alter table "public"."organization_members" drop constraint "organization_members_user_id_public_users_fkey";

alter table "public"."quotes" drop constraint "quotes_customer_id_fkey";

alter table "public"."quotes" drop constraint "quotes_org_id_fkey";

alter table "public"."statements" drop constraint "statements_customer_id_fkey";

alter table "public"."statements" drop constraint "statements_org_id_fkey";

alter table "public"."invoices" alter column "token" set default replace(replace(encode(extensions.gen_random_bytes(18), 'base64'::text), '+'::text, '-'::text), '/'::text, '_'::text);

alter table "public"."quotes" alter column "token" set default replace(replace(encode(extensions.gen_random_bytes(18), 'base64'::text), '+'::text, '-'::text), '/'::text, '_'::text);

alter table "public"."statements" alter column "token" set default encode(extensions.gen_random_bytes(16), 'hex'::text);

alter table "public"."customers" add constraint "customers_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."customers" validate constraint "customers_org_id_fkey";

alter table "public"."invoice_recurring" add constraint "invoice_recurring_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE not valid;

alter table "public"."invoice_recurring" validate constraint "invoice_recurring_customer_id_fkey";

alter table "public"."invoice_recurring" add constraint "invoice_recurring_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."invoice_recurring" validate constraint "invoice_recurring_org_id_fkey";

alter table "public"."invoice_send_templates" add constraint "invoice_send_templates_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."invoice_send_templates" validate constraint "invoice_send_templates_org_id_fkey";

alter table "public"."invoice_templates" add constraint "invoice_templates_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."invoice_templates" validate constraint "invoice_templates_org_id_fkey";

alter table "public"."invoices" add constraint "invoices_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL not valid;

alter table "public"."invoices" validate constraint "invoices_customer_id_fkey";

alter table "public"."invoices" add constraint "invoices_invoice_recurring_id_fkey" FOREIGN KEY (invoice_recurring_id) REFERENCES public.invoice_recurring(id) ON DELETE SET NULL not valid;

alter table "public"."invoices" validate constraint "invoices_invoice_recurring_id_fkey";

alter table "public"."invoices" add constraint "invoices_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."invoices" validate constraint "invoices_org_id_fkey";

alter table "public"."invoices" add constraint "invoices_quote_id_fkey" FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL not valid;

alter table "public"."invoices" validate constraint "invoices_quote_id_fkey";

alter table "public"."invoices" add constraint "invoices_send_template_id_fkey" FOREIGN KEY (send_template_id) REFERENCES public.invoice_send_templates(id) ON DELETE SET NULL not valid;

alter table "public"."invoices" validate constraint "invoices_send_template_id_fkey";

alter table "public"."organization_members" add constraint "organization_members_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."organization_members" validate constraint "organization_members_org_id_fkey";

alter table "public"."organization_members" add constraint "organization_members_user_id_public_users_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL not valid;

alter table "public"."organization_members" validate constraint "organization_members_user_id_public_users_fkey";

alter table "public"."quotes" add constraint "quotes_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) not valid;

alter table "public"."quotes" validate constraint "quotes_customer_id_fkey";

alter table "public"."quotes" add constraint "quotes_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."quotes" validate constraint "quotes_org_id_fkey";

alter table "public"."statements" add constraint "statements_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE not valid;

alter table "public"."statements" validate constraint "statements_customer_id_fkey";

alter table "public"."statements" add constraint "statements_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."statements" validate constraint "statements_org_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_invoice_by_token(p_token text)
 RETURNS SETOF public.invoices
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT * FROM public.invoices WHERE token = p_token LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_quote_by_token(p_token text)
 RETURNS SETOF public.quotes
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT * FROM public.quotes WHERE token = p_token AND status = 'sent' LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_statement_by_token(p_token text)
 RETURNS SETOF public.statements
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT * FROM public.statements WHERE token = p_token LIMIT 1;
$function$
;


  create policy "members can delete customers"
  on "public"."customers"
  as permissive
  for delete
  to public
using ((org_id IN ( SELECT public.my_org_ids() AS my_org_ids)));



  create policy "members can insert customers"
  on "public"."customers"
  as permissive
  for insert
  to public
with check ((org_id IN ( SELECT public.my_org_ids() AS my_org_ids)));



  create policy "members can update customers"
  on "public"."customers"
  as permissive
  for update
  to public
using ((org_id IN ( SELECT public.my_org_ids() AS my_org_ids)));



  create policy "members can view customers"
  on "public"."customers"
  as permissive
  for select
  to public
using ((org_id IN ( SELECT public.my_org_ids() AS my_org_ids)));



  create policy "org members can create recurring series"
  on "public"."invoice_recurring"
  as permissive
  for insert
  to public
with check ((org_id IN ( SELECT organization_members.org_id
   FROM public.organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.status = 'active'::text)))));



  create policy "org members can update recurring series"
  on "public"."invoice_recurring"
  as permissive
  for update
  to public
using ((org_id IN ( SELECT organization_members.org_id
   FROM public.organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.status = 'active'::text)))));



  create policy "org members can view recurring series"
  on "public"."invoice_recurring"
  as permissive
  for select
  to public
using ((org_id IN ( SELECT organization_members.org_id
   FROM public.organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.status = 'active'::text)))));



  create policy "Org members can manage their templates"
  on "public"."invoice_send_templates"
  as permissive
  for all
  to public
using (((org_id IS NOT NULL) AND (org_id IN ( SELECT organization_members.org_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid())))));



  create policy "Org members can read their templates"
  on "public"."invoice_send_templates"
  as permissive
  for select
  to public
using (((org_id IS NOT NULL) AND (org_id IN ( SELECT organization_members.org_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid())))));



  create policy "members can delete invoice templates"
  on "public"."invoice_templates"
  as permissive
  for delete
  to public
using ((org_id IN ( SELECT public.my_org_ids() AS my_org_ids)));



  create policy "members can insert invoice templates"
  on "public"."invoice_templates"
  as permissive
  for insert
  to public
with check ((org_id IN ( SELECT public.my_org_ids() AS my_org_ids)));



  create policy "members can update invoice templates"
  on "public"."invoice_templates"
  as permissive
  for update
  to public
using ((org_id IN ( SELECT public.my_org_ids() AS my_org_ids)));



  create policy "members can view invoice templates"
  on "public"."invoice_templates"
  as permissive
  for select
  to public
using ((org_id IN ( SELECT public.my_org_ids() AS my_org_ids)));



  create policy "members can delete invoices"
  on "public"."invoices"
  as permissive
  for delete
  to public
using ((org_id IN ( SELECT public.my_org_ids() AS my_org_ids)));



  create policy "members can insert invoices"
  on "public"."invoices"
  as permissive
  for insert
  to public
with check ((org_id IN ( SELECT public.my_org_ids() AS my_org_ids)));



  create policy "members can update invoices"
  on "public"."invoices"
  as permissive
  for update
  to public
using ((org_id IN ( SELECT public.my_org_ids() AS my_org_ids)));



  create policy "members can view invoices"
  on "public"."invoices"
  as permissive
  for select
  to public
using ((org_id IN ( SELECT public.my_org_ids() AS my_org_ids)));



  create policy "members can delete memberships"
  on "public"."organization_members"
  as permissive
  for delete
  to public
using ((((user_id = auth.uid()) AND ((role <> 'owner'::text) OR (( SELECT count(*) AS count
   FROM public.organization_members om
  WHERE ((om.org_id = organization_members.org_id) AND (om.role = 'owner'::text) AND (om.status = 'active'::text))) > 1))) OR ((org_id IN ( SELECT organization_members_1.org_id
   FROM public.organization_members organization_members_1
  WHERE ((organization_members_1.user_id = auth.uid()) AND (organization_members_1.role = 'owner'::text) AND (organization_members_1.status = 'active'::text)))) AND (user_id <> auth.uid()) AND (role <> 'owner'::text))));



  create policy "members can insert memberships"
  on "public"."organization_members"
  as permissive
  for insert
  to authenticated
with check (
  ("user_id" = auth.uid() AND NOT EXISTS (
    SELECT 1 FROM public.organization_members om WHERE om.org_id = organization_members.org_id
  ))
  OR
  ("user_id" IS NULL AND org_id IN (SELECT public.my_org_ids() AS my_org_ids))
);



  create policy "members can view memberships"
  on "public"."organization_members"
  as permissive
  for select
  to public
using ((org_id IN ( SELECT public.my_org_ids() AS my_org_ids)));



  create policy "members can update their orgs"
  on "public"."organizations"
  as permissive
  for update
  to public
using ((id IN ( SELECT public.my_org_ids() AS my_org_ids)));



  create policy "members can view their orgs"
  on "public"."organizations"
  as permissive
  for select
  to public
using ((id IN ( SELECT public.my_org_ids() AS my_org_ids)));



  create policy "org members can delete quotes"
  on "public"."quotes"
  as permissive
  for delete
  to public
using ((org_id IN ( SELECT organization_members.org_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));



  create policy "org members can insert quotes"
  on "public"."quotes"
  as permissive
  for insert
  to public
with check ((org_id IN ( SELECT organization_members.org_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));



  create policy "org members can select quotes"
  on "public"."quotes"
  as permissive
  for select
  to public
using ((org_id IN ( SELECT public.my_org_ids() AS my_org_ids)));



  create policy "org members can update quotes"
  on "public"."quotes"
  as permissive
  for update
  to public
using ((org_id IN ( SELECT organization_members.org_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));



  create policy "members can manage statements"
  on "public"."statements"
  as permissive
  for all
  to public
using ((org_id IN ( SELECT organization_members.org_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))))
with check ((org_id IN ( SELECT organization_members.org_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));



  create policy "org members can view each other"
  on "public"."users"
  as permissive
  for select
  to public
using ((id IN ( SELECT om2.user_id
   FROM (public.organization_members om1
     JOIN public.organization_members om2 ON ((om2.org_id = om1.org_id)))
  WHERE ((om1.user_id = auth.uid()) AND (om1.status = 'active'::text) AND (om2.status = 'active'::text)))));


CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_quotes_updated_at();

drop trigger if exists "on_auth_user_created" on "auth"."users";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Org members can delete org assets"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'org-assets'::text) AND ((storage.foldername(name))[1] = 'logos'::text) AND (EXISTS ( SELECT 1
   FROM public.organization_members
  WHERE (((organization_members.org_id)::text = (storage.foldername(objects.name))[2]) AND (organization_members.user_id = auth.uid()) AND (organization_members.status = 'active'::text))))));



  create policy "Org members can update org assets"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'org-assets'::text) AND ((storage.foldername(name))[1] = 'logos'::text) AND (EXISTS ( SELECT 1
   FROM public.organization_members
  WHERE (((organization_members.org_id)::text = (storage.foldername(objects.name))[2]) AND (organization_members.user_id = auth.uid()) AND (organization_members.status = 'active'::text))))));



  create policy "Org members can upload org assets"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'org-assets'::text) AND ((storage.foldername(name))[1] = 'logos'::text) AND (EXISTS ( SELECT 1
   FROM public.organization_members
  WHERE (((organization_members.org_id)::text = (storage.foldername(objects.name))[2]) AND (organization_members.user_id = auth.uid()) AND (organization_members.status = 'active'::text))))));



  create policy "Public can read avatars"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'avatars'::text));



  create policy "Public can read org assets"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'org-assets'::text));



  create policy "Users can delete own avatar"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can update own avatar"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can upload own avatar"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



