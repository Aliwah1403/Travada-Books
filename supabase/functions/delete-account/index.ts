import { createClient } from "npm:@supabase/supabase-js@2"
import { prepareOrgForDeletion, rollbackPrepared, triggerDeletion, type PreparedOrgDeletion } from "../_shared/org-deletion.ts"

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

  // Block deletion if the user is the sole active owner of any org that
  // still has other active members — deleting them would leave that org
  // ownerless. Uses the userClient (not adminClient) so auth.uid() inside
  // the SECURITY DEFINER function resolves to this user, and reuses the
  // exact same rule the UI checks before showing the delete dialog.
  const { data: soleOwnerOrgs, error: soleOwnerError } = await userClient.rpc(
    "get_sole_owner_shared_orgs",
  )
  if (soleOwnerError) {
    console.error("delete-account: sole-owner check failed:", soleOwnerError.message)
    return json({ error: "Internal server error" }, 500)
  }
  if (soleOwnerOrgs && soleOwnerOrgs.length > 0) {
    return json({ error: "sole_owner", orgs: soleOwnerOrgs }, 409)
  }

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

  // No sole-member orgs: nothing to export, behave exactly as before.
  if (orgsToDelete.length === 0) {
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)
    if (deleteError) {
      console.error("delete-account: auth user delete failed:", deleteError.message)
      return json({ error: "Failed to delete account" }, 500)
    }

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
  }

  // There ARE sole-member orgs — export + delete each one via the worker
  // task, then ban + sign out the user (the task deletes the auth user once
  // every org's export has completed).
  if (!user.email) return json({ error: "Could not resolve your email address" }, 500)

  const prepared: PreparedOrgDeletion[] = []
  try {
    for (const orgId of orgsToDelete) {
      const p = await prepareOrgForDeletion(adminClient, orgId, {
        emailTo: user.email,
        requestedBy: user.id,
      })
      prepared.push(p)
    }
  } catch (err) {
    console.error("delete-account: prepare failed:", err)
    await rollbackPrepared(adminClient, prepared)
    return json({ error: "Failed to start account deletion. Please try again." }, 500)
  }

  const triggerResult = await triggerDeletion({
    ownerEmail: user.email,
    orgs: prepared.map((p) => ({
      orgId: p.orgId,
      orgName: p.orgName,
      exportId: p.exportId,
      memberships: p.memberships,
      members: p.members,
      pausedRecurringIds: p.pausedRecurringIds,
    })),
    deleteUserId: user.id,
  })

  if (!triggerResult.ok) {
    await rollbackPrepared(adminClient, prepared)
    console.error("delete-account: trigger failed:", triggerResult.error)
    return json({ error: "Failed to start account deletion. Please try again." }, 500)
  }

  // Deletion is now in flight. Cut off access to those orgs immediately.
  const { error: removeMembersError } = await adminClient
    .from("organization_members")
    .delete()
    .in("org_id", orgsToDelete)
  if (removeMembersError) {
    console.error("delete-account: failed to remove memberships after trigger (non-fatal):", removeMembersError.message)
  }

  // Lock the account out now — the task deletes the auth user itself once
  // every org has been exported and deleted.
  const { error: banError } = await adminClient.auth.admin.updateUserById(user.id, { ban_duration: "876000h" })
  if (banError) {
    console.error("delete-account: failed to ban user (non-fatal):", banError.message)
  }

  const accessToken = authorization.replace(/^Bearer\s+/i, "")
  const { error: signOutError } = await adminClient.auth.admin.signOut(accessToken, "global")
  if (signOutError) {
    console.error("delete-account: failed to sign out user globally (non-fatal):", signOutError.message)
  }

  return json({ success: true, emailTo: user.email, exporting: true })
})
