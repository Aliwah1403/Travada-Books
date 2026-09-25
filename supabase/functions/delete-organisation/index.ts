import { createClient } from "npm:@supabase/supabase-js@2"
import { prepareOrgForDeletion, rollbackPrepared, triggerDeletion } from "../_shared/org-deletion.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } })

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  // supabase.functions.invoke() sends POST; a DELETE would also need Access-Control-Allow-Methods for the preflight
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders })

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
  if (!user.email) return json({ error: "Could not resolve your email address" }, 500)

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

  // Snapshot memberships, pause recurring invoices, and open an export row —
  // all before anything is actually deleted.
  let prepared
  try {
    prepared = await prepareOrgForDeletion(adminClient, orgId, {
      emailTo: user.email,
      requestedBy: user.id,
    })
  } catch (err) {
    console.error("delete-organisation: prepare failed:", err)
    return json({ error: "Failed to start deletion. Please try again." }, 500)
  }

  // Kick off the export + delete + purge task. Only once this succeeds do we
  // touch anything else — if it fails, nothing changes for the caller.
  const triggerResult = await triggerDeletion({
    ownerEmail: user.email,
    orgs: [
      {
        orgId: prepared.orgId,
        orgName: prepared.orgName,
        exportId: prepared.exportId,
        memberships: prepared.memberships,
        members: prepared.members,
        pausedRecurringIds: prepared.pausedRecurringIds,
      },
    ],
  })

  if (!triggerResult.ok) {
    await rollbackPrepared(adminClient, [prepared])
    console.error("delete-organisation: trigger failed:", triggerResult.error)
    return json({ error: "Failed to start deletion. Please try again." }, 500)
  }

  // Deletion is now in flight on the worker. Cut off access immediately —
  // members lose access to the org right away, well before the export/delete
  // task finishes.
  const { error: removeMembersError } = await adminClient
    .from("organization_members")
    .delete()
    .eq("org_id", orgId)
  if (removeMembersError) {
    console.error("delete-organisation: failed to remove memberships after trigger (non-fatal):", removeMembersError.message)
  }

  const { error: clearActiveOrgError } = await adminClient
    .from("users")
    .update({ active_org_id: null })
    .eq("active_org_id", orgId)
  if (clearActiveOrgError) {
    console.error("delete-organisation: failed to clear active_org_id (non-fatal):", clearActiveOrgError.message)
  }

  return json({ success: true, emailTo: user.email })
})
