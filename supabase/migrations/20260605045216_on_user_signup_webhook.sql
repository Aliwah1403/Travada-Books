-- Create the on-user-signup webhook trigger if it doesn't already exist.
-- On local: trigger is absent → creates it pointing at the local Docker edge runtime.
-- On remote: trigger already exists (set up manually in the dashboard) → skips, preserving the correct remote URL.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'resend_contact_add'
      AND event_object_schema = 'public'
      AND event_object_table = 'users'
  ) THEN
    CREATE TRIGGER resend_contact_add
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION supabase_functions.http_request(
      'http://host.docker.internal:54321/functions/v1/on-user-signup',
      'POST',
      '{"Content-type":"application/json"}',
      '{}',
      '5000'
    );
  END IF;
END $$;
