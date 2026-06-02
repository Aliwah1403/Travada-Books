-- Add authentication guard to accept_invite to prevent anonymous callers from
-- accepting invitations. Without this, auth.uid() and auth.jwt()->>'email' are
-- NULL for unauthenticated calls, and NULL != lower(v_row.email) evaluates to
-- NULL (not true), so email_mismatch is never raised and the UPDATE runs with
-- user_id = NULL.
CREATE OR REPLACE FUNCTION "public"."accept_invite"("token" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_row organization_members%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR auth.jwt()->>'email' IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;
  SELECT * INTO v_row FROM organization_members WHERE id = token;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_token'; END IF;
  IF v_row.status != 'invited' THEN RAISE EXCEPTION 'already_accepted'; END IF;
  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < now() THEN RAISE EXCEPTION 'expired'; END IF;
  IF lower(v_row.email) != lower(auth.jwt()->>'email') THEN RAISE EXCEPTION 'email_mismatch'; END IF;
  UPDATE organization_members SET user_id = auth.uid(), status = 'active' WHERE id = token;
  RETURN v_row.org_id;
END;
$$;
