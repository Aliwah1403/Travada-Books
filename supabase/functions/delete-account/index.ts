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

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authorization } } },
  )
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return json({ error: "Unauthorized" }, 401)

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  )

  const { data: memberships, error: memberError } = await adminClient
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("status", "active")

  if (memberError) {
    console.error("delete-account: membership lookup failed:", memberError.message)
    return json({ error: "Internal server error" }, 500)
  }

  const orgIds = (memberships ?? []).map((m) => m.org_id)

  // Identify orgs where this user is the only real (non-invited) active member
  const orgsToDelete: string[] = []
  for (const orgId of orgIds) {
    const { count } = await adminClient
      .from("organization_members")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "active")
      .not("user_id", "is", null)

    if ((count ?? 0) <= 1) {
      orgsToDelete.push(orgId)
    }
  }

  // Clean up Storage logos before deleting orgs
  if (orgsToDelete.length > 0) {
    const { data: orgs } = await adminClient
      .from("organizations")
      .select("id, logo_url")
      .in("id", orgsToDelete)

    const logoPaths: string[] = []
    for (const org of orgs ?? []) {
      if (org.logo_url) {
        const match = (org.logo_url as string).match(/\/org-assets\/(.+)$/)
        if (match?.[1]) logoPaths.push(match[1])
      }
    }
    if (logoPaths.length > 0) {
      const { error: storageError } = await adminClient.storage.from("org-assets").remove(logoPaths)
      if (storageError) {
        console.error("delete-account: storage cleanup failed (non-fatal):", storageError.message)
      }
    }

    const { error: orgDeleteError } = await adminClient
      .from("organizations")
      .delete()
      .in("id", orgsToDelete)

    if (orgDeleteError) {
      console.error("delete-account: org delete failed:", orgDeleteError.message)
      return json({ error: "Failed to delete account data" }, 500)
    }
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)
  if (deleteError) {
    console.error("delete-account: auth user delete failed:", deleteError.message)
    return json({ error: "Failed to delete account" }, 500)
  }

  // Remove from Resend audience via Trigger.dev task (fire-and-forget)
  const TRIGGER_SECRET_KEY = Deno.env.get("TRIGGER_SECRET_KEY")
  if (TRIGGER_SECRET_KEY && user.email) {
    fetch("https://api.trigger.dev/api/v1/tasks/resend-remove-contact/trigger", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TRIGGER_SECRET_KEY}`,
        "Content-Type": "application/json",
        "x-trigger-api-version": "2023-11-14",
      },
      body: JSON.stringify({ payload: { email: user.email } }),
    }).catch((err) => console.error("delete-account: Trigger.dev resend-remove-contact fire failed (non-fatal):", err))
  }

  return json({ success: true })
})
