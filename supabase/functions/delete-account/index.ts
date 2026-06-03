import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } })

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  const authorization = req.headers.get("Authorization")
  if (!authorization) return json({ error: "Unauthorized" }, 401)

  // Verify the caller's JWT to get their user ID
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authorization } } },
  )
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return json({ error: "Unauthorized" }, 401)

  // Admin client for privileged operations
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  )

  // Find orgs where this user is the only member
  const { data: memberships, error: memberError } = await adminClient
    .from("organization_members")
    .select("org_id, organizations(id, name)")
    .eq("user_id", user.id)
    .eq("status", "active")

  if (memberError) {
    console.error("delete-account: membership lookup failed:", memberError.message)
    return json({ error: "Internal server error" }, 500)
  }

  const orgIds = (memberships ?? []).map((m) => m.org_id)

  // For each org, check if this user is the only active member
  const orgsToDelete: string[] = []
  for (const orgId of orgIds) {
    const { count } = await adminClient
      .from("organization_members")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "active")

    if ((count ?? 0) <= 1) {
      orgsToDelete.push(orgId)
    }
  }

  // Delete sole-member orgs — cascades to invoices, customers, quotes, statements, etc.
  if (orgsToDelete.length > 0) {
    const { error: orgDeleteError } = await adminClient
      .from("organizations")
      .delete()
      .in("id", orgsToDelete)

    if (orgDeleteError) {
      console.error("delete-account: org delete failed:", orgDeleteError.message)
      return json({ error: "Failed to delete account data" }, 500)
    }
  }

  // Delete the auth user — cascades to public.users and organization_members
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)
  if (deleteError) {
    console.error("delete-account: auth user delete failed:", deleteError.message)
    return json({ error: "Failed to delete account" }, 500)
  }

  return json({ success: true })
})
