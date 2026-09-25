import type { SupabaseClient } from "npm:@supabase/supabase-js@2"

// Shared by delete-organisation and delete-account: both flows now export an
// org's full data (see ORG-EXPORT-PLAN.md, Phase B) before deleting it,
// via the `delete-orgs-with-export` Trigger.dev task. These helpers snapshot
// everything the task needs *before* anything is removed, kick the task off,
// and — if kicking it off fails — undo the snapshot side effects so the
// request can report "nothing changed".

// A raw `organization_members` row, all columns, exactly as stored. Re-insert
// verbatim (upsert on `id`) if deletion has to be rolled back.
export type MembershipSnapshot = Record<string, unknown>

export type MemberExportRow = {
  Name: string
  Email: string
  Role: string
  Status: string
  Joined: string
}

export type PreparedOrgDeletion = {
  orgId: string
  orgName: string
  exportId: string
  memberships: MembershipSnapshot[]
  members: MemberExportRow[]
  pausedRecurringIds: string[]
}

export type DeleteOrgsWithExportPayload = {
  ownerEmail: string
  orgs: {
    orgId: string
    orgName: string
    exportId: string
    memberships: MembershipSnapshot[]
    members: MemberExportRow[]
    pausedRecurringIds: string[]
  }[]
  deleteUserId?: string
}

/**
 * Snapshot everything `delete-orgs-with-export` needs for one org, pause its
 * recurring invoices for the deletion window, and insert its
 * `org_data_exports` row — all *before* anything is deleted. Throws on
 * failure; if the pause succeeded but the export-row insert didn't, it
 * unpauses before throwing so a failed prepare never leaves half-applied
 * state for the caller to worry about.
 */
export async function prepareOrgForDeletion(
  db: SupabaseClient,
  orgId: string,
  opts: { emailTo: string; requestedBy: string | null },
): Promise<PreparedOrgDeletion> {
  const { data: org, error: orgError } = await db
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .single()
  if (orgError || !org) {
    throw new Error(`Failed to fetch organisation ${orgId}: ${orgError?.message ?? "not found"}`)
  }
  const orgName = (org.name as string | null) ?? "organisation"

  const { data: memberships, error: membershipsError } = await db
    .from("organization_members")
    .select("*")
    .eq("org_id", orgId)
  if (membershipsError) {
    throw new Error(`Failed to snapshot memberships for org ${orgId}: ${membershipsError.message}`)
  }
  const membershipRows = (memberships ?? []) as MembershipSnapshot[]

  const userIds = membershipRows
    .map((m) => m.user_id as string | null)
    .filter((id): id is string => !!id)

  let usersById = new Map<string, { full_name: string | null; email: string | null }>()
  if (userIds.length > 0) {
    const { data: users, error: usersError } = await db
      .from("users")
      .select("id, full_name, email")
      .in("id", userIds)
    if (usersError) {
      throw new Error(`Failed to fetch member users for org ${orgId}: ${usersError.message}`)
    }
    usersById = new Map(
      (users ?? []).map((u) => [u.id as string, { full_name: u.full_name as string | null, email: u.email as string | null }]),
    )
  }

  const members: MemberExportRow[] = membershipRows.map((m) => {
    const userId = m.user_id as string | null
    const user = userId ? usersById.get(userId) : undefined
    return {
      Name: user?.full_name ?? "",
      Email: user?.email ?? (m.email as string | null) ?? "",
      Role: (m.role as string) ?? "",
      Status: (m.status as string) ?? "",
      Joined: (m.created_at as string) ?? "",
    }
  })

  const { data: pausedRows, error: pauseError } = await db
    .from("invoice_recurring")
    .update({ status: "paused" })
    .eq("org_id", orgId)
    .eq("status", "active")
    .select("id")
  if (pauseError) {
    throw new Error(`Failed to pause recurring invoices for org ${orgId}: ${pauseError.message}`)
  }
  const pausedRecurringIds = (pausedRows ?? []).map((r) => r.id as string)

  const { data: exportRow, error: insertError } = await db
    .from("org_data_exports")
    .insert({
      org_id: orgId,
      org_name: orgName,
      requested_by: opts.requestedBy,
      email_to: opts.emailTo,
      reason: "org_deletion",
      status: "processing",
    })
    .select("id")
    .single()

  if (insertError || !exportRow) {
    // Undo the pause we just performed — don't leave recurring invoices
    // paused with nothing to show for it.
    if (pausedRecurringIds.length > 0) {
      await db
        .from("invoice_recurring")
        .update({ status: "active" })
        .in("id", pausedRecurringIds)
        .eq("status", "paused")
    }
    throw new Error(`Failed to create export record for org ${orgId}: ${insertError?.message ?? "no row returned"}`)
  }

  return {
    orgId,
    orgName,
    exportId: exportRow.id as string,
    memberships: membershipRows,
    members,
    pausedRecurringIds,
  }
}

/**
 * Undo `prepareOrgForDeletion`'s side effects for orgs that were already
 * prepared when a later step (another org's prepare, or the trigger POST)
 * failed. Best-effort — logs and continues past individual failures so one
 * bad row doesn't block rolling back the rest.
 */
export async function rollbackPrepared(db: SupabaseClient, prepared: PreparedOrgDeletion[]): Promise<void> {
  for (const p of prepared) {
    if (p.pausedRecurringIds.length > 0) {
      const { error } = await db
        .from("invoice_recurring")
        .update({ status: "active" })
        .in("id", p.pausedRecurringIds)
        .eq("status", "paused")
      if (error) {
        console.error(`rollbackPrepared: failed to unpause recurring invoices for org ${p.orgId}:`, error.message)
      }
    }

    const { error: expError } = await db
      .from("org_data_exports")
      .update({ status: "failed", error: "Deletion could not be started; nothing was removed." })
      .eq("id", p.exportId)
    if (expError) {
      console.error(`rollbackPrepared: failed to mark export failed for org ${p.orgId}:`, expError.message)
    }
  }
}

/**
 * Fire the `delete-orgs-with-export` Trigger.dev task. Mirrors the direct
 * REST trigger used by export-org-data/index.ts (fire-and-continue — the
 * task can run for up to an hour, we don't await it here).
 */
export async function triggerDeletion(
  payload: DeleteOrgsWithExportPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const triggerSecretKey = Deno.env.get("TRIGGER_SECRET_KEY")
  if (!triggerSecretKey) return { ok: false, error: "TRIGGER_SECRET_KEY not configured" }

  try {
    const response = await fetch("https://api.trigger.dev/api/v1/tasks/delete-orgs-with-export/trigger", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${triggerSecretKey}`,
      },
      body: JSON.stringify({ payload }),
    })

    if (!response.ok) {
      const err = await response.text()
      return { ok: false, error: `Trigger.dev error: ${err}` }
    }

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
