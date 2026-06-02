


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."accept_invite"("token" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_row organization_members%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM organization_members WHERE id = token;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_token'; END IF;
  IF v_row.status != 'invited' THEN RAISE EXCEPTION 'already_accepted'; END IF;
  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < now() THEN RAISE EXCEPTION 'expired'; END IF;
  IF lower(v_row.email) != lower(auth.jwt()->>'email') THEN RAISE EXCEPTION 'email_mismatch'; END IF;
  UPDATE organization_members SET user_id = auth.uid(), status = 'active' WHERE id = token;
  RETURN v_row.org_id;
END;
$$;


ALTER FUNCTION "public"."accept_invite"("token" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_invite_info"("token" "uuid") RETURNS TABLE("org_name" "text", "email" "text", "role" "text", "status" "text", "expires_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT o.name, om.email, om.role, om.status, om.expires_at
  FROM organization_members om
  JOIN organizations o ON o.id = om.org_id
  WHERE om.id = token;
$$;


ALTER FUNCTION "public"."get_invite_info"("token" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

CREATE OR REPLACE TRIGGER "on_auth_user_created"
  AFTER INSERT ON "auth"."users"
  FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();


CREATE OR REPLACE FUNCTION "public"."my_org_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  select org_id from public.organization_members where user_id = auth.uid()
$$;


ALTER FUNCTION "public"."my_org_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."next_invoice_number"("p_org_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  last_number text;
  prefix      text;
  digits      text;
  next_num    bigint;
BEGIN
  SELECT invoice_number
    INTO last_number
    FROM public.invoices
   WHERE org_id = p_org_id
     AND invoice_number IS NOT NULL
   ORDER BY created_at DESC
   LIMIT 1;

  IF last_number IS NULL THEN
    RETURN 'INV-0001';
  END IF;

  -- Extract trailing digit sequence
  SELECT (regexp_match(last_number, '^(.*?)(\d+)$'))[1],
         (regexp_match(last_number, '^(.*?)(\d+)$'))[2]
    INTO prefix, digits;

  IF digits IS NULL THEN
    RETURN last_number || '-0001';
  END IF;

  next_num := digits::bigint + 1;
  RETURN prefix || lpad(next_num::text, length(digits), '0');
END;
$_$;


ALTER FUNCTION "public"."next_invoice_number"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."next_invoice_number"("p_org_id" "uuid", "p_customer_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  last_number text;
  prefix      text;
  digits      text;
  next_num    bigint;
BEGIN
  SELECT invoice_number
    INTO last_number
    FROM public.invoices
   WHERE org_id = p_org_id
     AND customer_id = p_customer_id
     AND invoice_number IS NOT NULL
   ORDER BY created_at DESC
   LIMIT 1;

  IF last_number IS NULL THEN
    RETURN 'INV-0001';
  END IF;

  SELECT (regexp_match(last_number, '^(.*?)(\d+)$'))[1],
         (regexp_match(last_number, '^(.*?)(\d+)$'))[2]
    INTO prefix, digits;

  IF digits IS NULL THEN
    RETURN last_number || '-0001';
  END IF;

  next_num := digits::bigint + 1;
  RETURN prefix || lpad(next_num::text, length(digits), '0');
END;
$_$;


ALTER FUNCTION "public"."next_invoice_number"("p_org_id" "uuid", "p_customer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."next_quote_number"("p_org_id" "uuid", "p_customer_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
  last_num int;
BEGIN
  SELECT COALESCE(
    MAX(
      CAST(
        NULLIF(regexp_replace(quote_number, '^QUO-0*', ''), '') AS int
      )
    ), 0
  )
  INTO last_num
  FROM quotes
  WHERE org_id = p_org_id
    AND customer_id = p_customer_id
    AND quote_number ~ '^QUO-\d+$';

  RETURN 'QUO-' || LPAD((last_num + 1)::text, 4, '0');
END;
$_$;


ALTER FUNCTION "public"."next_quote_number"("p_org_id" "uuid", "p_customer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_quotes_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_quotes_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "billing_email" "text",
    "phone" "text",
    "website" "text",
    "address_line1" "text",
    "address_line2" "text",
    "city" "text",
    "state" "text",
    "zip" "text",
    "country" "text",
    "country_code" "text",
    "vat_number" "text",
    "note" "text",
    "logo_url" "text",
    "preferred_currency" "text",
    "is_archived" boolean DEFAULT false NOT NULL,
    "enrichment_status" "text",
    "enriched_at" timestamp with time zone,
    "industry" "text",
    "description" "text",
    "company_type" "text",
    "employee_count" integer,
    "linkedin_url" "text",
    "twitter_url" "text",
    "portal_enabled" boolean DEFAULT false NOT NULL,
    "portal_id" "text",
    "token" "text",
    "main_contact" "text",
    "founded_year" integer,
    "estimated_revenue" "text",
    "funding_stage" "text",
    "total_funding" "text",
    "headquarters_location" "text",
    "instagram_url" "text",
    "facebook_url" "text",
    "ceo_name" "text",
    "finance_contact" "text",
    "finance_contact_email" "text",
    "primary_language" "text",
    "fiscal_year_end" "text",
    CONSTRAINT "customers_enrichment_status_check" CHECK (("enrichment_status" = ANY (ARRAY['pending'::"text", 'done'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exchange_rates" (
    "base" "text" NOT NULL,
    "target" "text" NOT NULL,
    "rate" numeric NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."exchange_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_recurring" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "customer_name" "text" NOT NULL,
    "currency" "text" DEFAULT 'KES'::"text" NOT NULL,
    "line_items" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "subtotal" numeric DEFAULT 0 NOT NULL,
    "tax_amount" numeric DEFAULT 0 NOT NULL,
    "discount" numeric DEFAULT 0 NOT NULL,
    "total" numeric DEFAULT 0 NOT NULL,
    "payment_details" "text" DEFAULT ''::"text" NOT NULL,
    "note" "text" DEFAULT ''::"text" NOT NULL,
    "accept_payments" boolean DEFAULT false NOT NULL,
    "invoice_template" "text" DEFAULT 'classic'::"text" NOT NULL,
    "from_details" "jsonb",
    "customer_details" "jsonb",
    "source_issue_date" "date" NOT NULL,
    "source_due_date" "date",
    "frequency" "text" NOT NULL,
    "end_type" "text" DEFAULT 'never'::"text" NOT NULL,
    "end_on_date" "date",
    "end_after_count" integer,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "current_count" integer DEFAULT 1 NOT NULL,
    "failure_count" integer DEFAULT 0 NOT NULL,
    "next_scheduled_at" timestamp with time zone NOT NULL,
    "upcoming_notification_sent_at" timestamp with time zone,
    CONSTRAINT "invoice_recurring_end_type_check" CHECK (("end_type" = ANY (ARRAY['never'::"text", 'on_date'::"text", 'after_count'::"text"]))),
    CONSTRAINT "invoice_recurring_frequency_check" CHECK (("frequency" = ANY (ARRAY['weekly'::"text", 'biweekly'::"text", 'monthly'::"text", 'quarterly'::"text", 'yearly'::"text"]))),
    CONSTRAINT "invoice_recurring_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'paused'::"text", 'completed'::"text", 'canceled'::"text"])))
);


ALTER TABLE "public"."invoice_recurring" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_send_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "org_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "subject" "text" NOT NULL,
    "body" "text" NOT NULL,
    "is_system" boolean DEFAULT false NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."invoice_send_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "is_default" boolean DEFAULT true NOT NULL,
    "logo_url" "text",
    "currency" "text",
    "payment_details" "jsonb",
    "note_details" "jsonb",
    "from_details" "jsonb",
    "date_format" "text" DEFAULT 'DD/MM/YYYY'::"text" NOT NULL,
    "include_tax" boolean DEFAULT true NOT NULL,
    "tax_rate" numeric(5,2) DEFAULT 16 NOT NULL,
    "include_discount" boolean DEFAULT false NOT NULL,
    "include_vat" boolean DEFAULT false NOT NULL,
    "size" "text" DEFAULT 'a4'::"text" NOT NULL,
    "invoice_template" "text" DEFAULT 'classic'::"text",
    "show_qty_column" boolean DEFAULT true,
    "accept_payments" boolean DEFAULT false,
    "cc" "text" DEFAULT ''::"text",
    "bcc" "text" DEFAULT ''::"text",
    "payment_terms" integer,
    "default_note" "text",
    "selected_payment_integration" "text",
    "reminder_days_after_due" integer,
    "default_payment_details" "text",
    CONSTRAINT "invoice_templates_size_check" CHECK (("size" = ANY (ARRAY['a4'::"text", 'letter'::"text"])))
);


ALTER TABLE "public"."invoice_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "customer_id" "uuid",
    "customer_name" "text",
    "token" "text" DEFAULT "replace"("replace"("encode"("extensions"."gen_random_bytes"(18), 'base64'::"text"), '+'::"text", '-'::"text"), '/'::"text", '_'::"text") NOT NULL,
    "invoice_number" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "issue_date" "date",
    "due_date" "date",
    "currency" "text" DEFAULT 'KES'::"text" NOT NULL,
    "line_items" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "subtotal" numeric(15,2),
    "tax_amount" numeric(15,2),
    "discount" numeric(15,2),
    "total" numeric(15,2),
    "customer_details" "jsonb",
    "from_details" "jsonb",
    "note" "text",
    "internal_note" "text",
    "recurring" "text" DEFAULT 'one_time'::"text" NOT NULL,
    "sent_at" timestamp with time zone,
    "paid_at" timestamp with time zone,
    "viewed_at" timestamp with time zone,
    "quote_id" "uuid",
    "payment_details" "text",
    "delivery_type" "text" DEFAULT 'none'::"text" NOT NULL,
    "scheduled_at" timestamp with time zone,
    "send_template_id" "uuid",
    "accept_payments" boolean DEFAULT false,
    "invoice_template" "text" DEFAULT 'classic'::"text" NOT NULL,
    "last_reminder_sent_at" timestamp with time zone,
    "next_send_at" timestamp with time zone,
    "invoice_recurring_id" "uuid",
    "recurring_sequence" integer,
    "overdue_alert_sent_at" timestamp with time zone,
    "exchange_rate" numeric,
    "converted_amount" numeric,
    "base_currency" "text",
    CONSTRAINT "invoices_recurring_check" CHECK (("recurring" = ANY (ARRAY['one_time'::"text", 'weekly'::"text", 'biweekly'::"text", 'monthly'::"text", 'quarterly'::"text", 'yearly'::"text"]))),
    CONSTRAINT "invoices_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'scheduled'::"text", 'unpaid'::"text", 'overdue'::"text", 'paid'::"text", 'canceled'::"text"])))
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


COMMENT ON COLUMN "public"."invoices"."next_send_at" IS 'Set by recurring-invoice-generator after each send; cron fires when next_send_at <= now().';



CREATE TABLE IF NOT EXISTS "public"."organization_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "role" "text" DEFAULT 'owner'::"text" NOT NULL,
    "email" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "expires_at" timestamp with time zone,
    CONSTRAINT "organization_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'member'::"text"]))),
    CONSTRAINT "organization_members_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'invited'::"text"])))
);


ALTER TABLE "public"."organization_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "logo_url" "text",
    "base_currency" "text" DEFAULT 'KES'::"text" NOT NULL,
    "country_code" "text" DEFAULT 'KE'::"text" NOT NULL,
    "address_line1" "text",
    "address_line2" "text",
    "city" "text",
    "state" "text",
    "zip" "text",
    "email" "text",
    "phone" "text",
    "website" "text",
    "tax_id" "text"
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quotes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "customer_name" "text",
    "token" "text" DEFAULT "replace"("replace"("encode"("extensions"."gen_random_bytes"(18), 'base64'::"text"), '+'::"text", '-'::"text"), '/'::"text", '_'::"text") NOT NULL,
    "quote_number" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "issue_date" "date",
    "valid_until" "date",
    "currency" "text" DEFAULT 'KES'::"text",
    "line_items" "jsonb" DEFAULT '[]'::"jsonb",
    "subtotal" numeric(15,2),
    "tax_amount" numeric(15,2),
    "discount" numeric(15,2),
    "total" numeric(15,2),
    "customer_details" "jsonb",
    "from_details" "jsonb",
    "note" "text",
    "internal_note" "text",
    "sent_at" timestamp with time zone,
    "accepted_at" timestamp with time zone,
    "declined_at" timestamp with time zone,
    "decline_reason" "text",
    "viewed_at" timestamp with time zone,
    "resent_at" timestamp with time zone,
    CONSTRAINT "quotes_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'sent'::"text", 'accepted'::"text", 'declined'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."quotes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."statements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "org_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "token" "text" DEFAULT "encode"("extensions"."gen_random_bytes"(16), 'hex'::"text") NOT NULL,
    "date_from" "date" NOT NULL,
    "date_to" "date" NOT NULL,
    "notes" "text",
    "snapshot_data" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "from_details" "jsonb",
    "customer_details" "jsonb"
);


ALTER TABLE "public"."statements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "email" "text",
    "phone" "text",
    "locale" "text" DEFAULT 'en'::"text" NOT NULL,
    "timezone" "text" DEFAULT 'Africa/Nairobi'::"text" NOT NULL,
    "date_format" "text" DEFAULT 'DD/MM/YYYY'::"text" NOT NULL,
    "time_format" "text" DEFAULT '24h'::"text" NOT NULL,
    "week_starts_on_monday" boolean DEFAULT false NOT NULL,
    "timezone_auto_sync" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_portal_id_key" UNIQUE ("portal_id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."exchange_rates"
    ADD CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("base", "target");



ALTER TABLE ONLY "public"."invoice_recurring"
    ADD CONSTRAINT "invoice_recurring_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_send_templates"
    ADD CONSTRAINT "invoice_send_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_templates"
    ADD CONSTRAINT "invoice_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_org_id_user_id_key" UNIQUE ("org_id", "user_id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."statements"
    ADD CONSTRAINT "statements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."statements"
    ADD CONSTRAINT "statements_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_invoice_recurring_due" ON "public"."invoice_recurring" USING "btree" ("next_scheduled_at") WHERE ("status" = 'active'::"text");



CREATE UNIQUE INDEX "invoices_customer_invoice_number_unique" ON "public"."invoices" USING "btree" ("customer_id", "invoice_number") WHERE (("customer_id" IS NOT NULL) AND ("invoice_number" IS NOT NULL) AND ("invoice_number" <> ''::"text"));



CREATE UNIQUE INDEX "quotes_quote_number_customer_id_key" ON "public"."quotes" USING "btree" ("customer_id", "quote_number") WHERE ("quote_number" IS NOT NULL);



CREATE OR REPLACE TRIGGER "invoices_updated_at" BEFORE UPDATE ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "quotes_updated_at" BEFORE UPDATE ON "public"."quotes" FOR EACH ROW EXECUTE FUNCTION "public"."update_quotes_updated_at"();



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_recurring"
    ADD CONSTRAINT "invoice_recurring_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_recurring"
    ADD CONSTRAINT "invoice_recurring_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_recurring"
    ADD CONSTRAINT "invoice_recurring_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_send_templates"
    ADD CONSTRAINT "invoice_send_templates_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_templates"
    ADD CONSTRAINT "invoice_templates_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_invoice_recurring_id_fkey" FOREIGN KEY ("invoice_recurring_id") REFERENCES "public"."invoice_recurring"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_send_template_id_fkey" FOREIGN KEY ("send_template_id") REFERENCES "public"."invoice_send_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_user_id_public_users_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."statements"
    ADD CONSTRAINT "statements_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."statements"
    ADD CONSTRAINT "statements_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Org members can manage their templates" ON "public"."invoice_send_templates" USING ((("org_id" IS NOT NULL) AND ("org_id" IN ( SELECT "organization_members"."org_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Org members can read their templates" ON "public"."invoice_send_templates" FOR SELECT USING ((("org_id" IS NOT NULL) AND ("org_id" IN ( SELECT "organization_members"."org_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "System templates are publicly readable" ON "public"."invoice_send_templates" FOR SELECT USING (("org_id" IS NULL));



CREATE POLICY "authenticated users can create orgs" ON "public"."organizations" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoice_recurring" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoice_send_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoice_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "members can delete customers" ON "public"."customers" FOR DELETE USING (("org_id" IN ( SELECT "public"."my_org_ids"() AS "my_org_ids")));



CREATE POLICY "members can delete invoice templates" ON "public"."invoice_templates" FOR DELETE USING (("org_id" IN ( SELECT "public"."my_org_ids"() AS "my_org_ids")));



CREATE POLICY "members can delete invoices" ON "public"."invoices" FOR DELETE USING (("org_id" IN ( SELECT "public"."my_org_ids"() AS "my_org_ids")));



CREATE POLICY "members can delete memberships" ON "public"."organization_members" FOR DELETE USING (("org_id" IN ( SELECT "public"."my_org_ids"() AS "my_org_ids")));



CREATE POLICY "members can insert customers" ON "public"."customers" FOR INSERT WITH CHECK (("org_id" IN ( SELECT "public"."my_org_ids"() AS "my_org_ids")));



CREATE POLICY "members can insert invoice templates" ON "public"."invoice_templates" FOR INSERT WITH CHECK (("org_id" IN ( SELECT "public"."my_org_ids"() AS "my_org_ids")));



CREATE POLICY "members can insert invoices" ON "public"."invoices" FOR INSERT WITH CHECK (("org_id" IN ( SELECT "public"."my_org_ids"() AS "my_org_ids")));



CREATE POLICY "members can insert memberships" ON "public"."organization_members" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) OR (("user_id" IS NULL) AND ("org_id" IN ( SELECT "public"."my_org_ids"() AS "my_org_ids")))));



CREATE POLICY "members can manage statements" ON "public"."statements" USING (("org_id" IN ( SELECT "organization_members"."org_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"())))) WITH CHECK (("org_id" IN ( SELECT "organization_members"."org_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "members can update customers" ON "public"."customers" FOR UPDATE USING (("org_id" IN ( SELECT "public"."my_org_ids"() AS "my_org_ids")));



CREATE POLICY "members can update invoice templates" ON "public"."invoice_templates" FOR UPDATE USING (("org_id" IN ( SELECT "public"."my_org_ids"() AS "my_org_ids")));



CREATE POLICY "members can update invoices" ON "public"."invoices" FOR UPDATE USING (("org_id" IN ( SELECT "public"."my_org_ids"() AS "my_org_ids")));



CREATE POLICY "members can update their orgs" ON "public"."organizations" FOR UPDATE USING (("id" IN ( SELECT "public"."my_org_ids"() AS "my_org_ids")));



CREATE POLICY "members can view customers" ON "public"."customers" FOR SELECT USING (("org_id" IN ( SELECT "public"."my_org_ids"() AS "my_org_ids")));



CREATE POLICY "members can view invoice templates" ON "public"."invoice_templates" FOR SELECT USING (("org_id" IN ( SELECT "public"."my_org_ids"() AS "my_org_ids")));



CREATE POLICY "members can view invoices" ON "public"."invoices" FOR SELECT USING (("org_id" IN ( SELECT "public"."my_org_ids"() AS "my_org_ids")));



CREATE POLICY "members can view memberships" ON "public"."organization_members" FOR SELECT USING (("org_id" IN ( SELECT "public"."my_org_ids"() AS "my_org_ids")));



CREATE POLICY "members can view their orgs" ON "public"."organizations" FOR SELECT USING (("id" IN ( SELECT "public"."my_org_ids"() AS "my_org_ids")));



CREATE POLICY "org members can create recurring series" ON "public"."invoice_recurring" FOR INSERT WITH CHECK (("org_id" IN ( SELECT "organization_members"."org_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."status" = 'active'::"text")))));



CREATE POLICY "org members can delete quotes" ON "public"."quotes" FOR DELETE USING (("org_id" IN ( SELECT "organization_members"."org_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "org members can insert quotes" ON "public"."quotes" FOR INSERT WITH CHECK (("org_id" IN ( SELECT "organization_members"."org_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "org members can select quotes" ON "public"."quotes" FOR SELECT USING ((("org_id" IN ( SELECT "organization_members"."org_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))) OR (("token" IS NOT NULL) AND ("status" = 'sent'::"text"))));



CREATE POLICY "org members can update quotes" ON "public"."quotes" FOR UPDATE USING (("org_id" IN ( SELECT "organization_members"."org_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "org members can update recurring series" ON "public"."invoice_recurring" FOR UPDATE USING (("org_id" IN ( SELECT "organization_members"."org_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."status" = 'active'::"text")))));



CREATE POLICY "org members can view each other" ON "public"."users" FOR SELECT USING (("id" IN ( SELECT "om2"."user_id"
   FROM ("public"."organization_members" "om1"
     JOIN "public"."organization_members" "om2" ON (("om2"."org_id" = "om1"."org_id")))
  WHERE (("om1"."user_id" = "auth"."uid"()) AND ("om1"."status" = 'active'::"text") AND ("om2"."status" = 'active'::"text")))));



CREATE POLICY "org members can view recurring series" ON "public"."invoice_recurring" FOR SELECT USING (("org_id" IN ( SELECT "organization_members"."org_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."status" = 'active'::"text")))));



ALTER TABLE "public"."organization_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public can view invoice by token" ON "public"."invoices" FOR SELECT USING (("token" IS NOT NULL));



CREATE POLICY "public can view statement by token" ON "public"."statements" FOR SELECT TO "anon" USING (("token" IS NOT NULL));



ALTER TABLE "public"."quotes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service role full access to recurring series" ON "public"."invoice_recurring" USING (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."statements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users can update own profile" ON "public"."users" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "users can view own profile" ON "public"."users" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































GRANT ALL ON FUNCTION "public"."accept_invite"("token" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_invite"("token" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_invite"("token" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_invite_info"("token" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_invite_info"("token" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_invite_info"("token" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."my_org_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."my_org_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."my_org_ids"() TO "service_role";

GRANT ALL ON FUNCTION "public"."next_invoice_number"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."next_invoice_number"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."next_invoice_number"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."next_invoice_number"("p_org_id" "uuid", "p_customer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."next_invoice_number"("p_org_id" "uuid", "p_customer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."next_invoice_number"("p_org_id" "uuid", "p_customer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."next_quote_number"("p_org_id" "uuid", "p_customer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."next_quote_number"("p_org_id" "uuid", "p_customer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."next_quote_number"("p_org_id" "uuid", "p_customer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";

-- Storage buckets (policies are applied in the next migration)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('org-assets', 'org-assets', true, 2097152, ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/svg+xml']),
  ('avatars', 'avatars', true, 2097152, ARRAY['image/png','image/jpeg','image/jpg','image/webp'])
ON CONFLICT (id) DO NOTHING;



GRANT ALL ON FUNCTION "public"."update_quotes_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_quotes_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_quotes_updated_at"() TO "service_role";
























GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."exchange_rates" TO "anon";
GRANT ALL ON TABLE "public"."exchange_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."exchange_rates" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_recurring" TO "anon";
GRANT ALL ON TABLE "public"."invoice_recurring" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_recurring" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_send_templates" TO "anon";
GRANT ALL ON TABLE "public"."invoice_send_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_send_templates" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_templates" TO "anon";
GRANT ALL ON TABLE "public"."invoice_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_templates" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."organization_members" TO "anon";
GRANT ALL ON TABLE "public"."organization_members" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_members" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."quotes" TO "anon";
GRANT ALL ON TABLE "public"."quotes" TO "authenticated";
GRANT ALL ON TABLE "public"."quotes" TO "service_role";



GRANT ALL ON TABLE "public"."statements" TO "anon";
GRANT ALL ON TABLE "public"."statements" TO "authenticated";
GRANT ALL ON TABLE "public"."statements" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































