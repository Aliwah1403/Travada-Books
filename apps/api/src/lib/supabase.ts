import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Service-role client: bypasses RLS. Every query made with it must be scoped
// to an org explicitly — see lib/scoped.ts. Never hand it to code that takes
// an org id from user input without checking membership first.
export function createServiceClient(url: string, serviceRoleKey: string): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
