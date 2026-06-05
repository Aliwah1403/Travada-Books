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

  let orgId: string | undefined
  try {
    const body = await req.json()
    orgId = body?.org_id
  } catch {
    return json({ error: "Invalid request body" }, 400)
  }
  if (!orgId) return json({ error: "org_id is required" }, 400)

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

  // Verify caller is an owner of this org
  const { data: membership, error: memberError } = await adminClient
    .from("organization_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single()

  if (memberError || !membership) {
    return json({ error: "Organisation not found" }, 404)
  }
  if (membership.role !== "owner") {
    return json({ error: "Only owners can delete an organisation" }, 403)
  }

  // Clean up Storage logo before deleting
  const { data: org } = await adminClient
    .from("organizations")
    .select("logo_url")
    .eq("id", orgId)
    .single()

  if (org?.logo_url) {
    const match = (org.logo_url as string).match(/\/org-assets\/(.+)$/)
    if (match?.[1]) {
      const { error: storageError } = await adminClient.storage.from("org-assets").remove([match[1]])
      if (storageError) {
        console.error("delete-organisation: storage cleanup failed (non-fatal):", storageError.message)
      }
    }
  }

  // Delete org — cascades to invoices, quotes, customers, statements, members, templates
  const { error: deleteError } = await adminClient
    .from("organizations")
    .delete()
    .eq("id", orgId)

  if (deleteError) {
    console.error("delete-organisation: org delete failed:", deleteError.message)
    return json({ error: "Failed to delete organisation" }, 500)
  }

  return json({ success: true })
})
