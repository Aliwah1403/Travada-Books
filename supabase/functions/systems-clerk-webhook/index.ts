import { Webhook } from "npm:svix@1"
import { db } from "../_shared/db.ts"

const EXTERNAL_SOURCE = "travada_systems"

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  const orgId = Deno.env.get("SYSTEMS_BOOKS_ORG_ID") ?? ""
  if (!orgId) {
    console.error("systems-clerk-webhook: SYSTEMS_BOOKS_ORG_ID is not set — refusing request")
    return json({ error: "Server misconfigured" }, 500)
  }
  const secret = Deno.env.get("CLERK_SYSTEMS_WEBHOOK_SECRET") ?? ""
  if (!secret) {
    console.error("systems-clerk-webhook: CLERK_SYSTEMS_WEBHOOK_SECRET is not set — refusing request")
    return json({ error: "Server misconfigured" }, 500)
  }

  const svixId = req.headers.get("svix-id")
  const svixTimestamp = req.headers.get("svix-timestamp")
  const svixSignature = req.headers.get("svix-signature")
  if (!svixId || !svixTimestamp || !svixSignature) {
    return json({ error: "Missing signature headers" }, 400)
  }

  const rawBody = await req.text()

  let evt: { type?: string; data?: { id?: string; name?: string; slug?: string } }
  try {
    evt = new Webhook(secret).verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof evt
  } catch {
    console.warn("systems-clerk-webhook: signature verification failed")
    return json({ error: "Invalid signature" }, 400)
  }

  const type = evt.type ?? ""
  const data = evt.data ?? {}
  const clerkOrgId = data.id ?? ""

  if (type !== "organization.created" && type !== "organization.updated" && type !== "organization.deleted") {
    return json({ ok: true, ignored: true })
  }
  if (!clerkOrgId) {
    console.warn(`systems-clerk-webhook: ${type} without an org id`)
    return json({ error: "Missing organization id" }, 400)
  }

  console.log(`systems-clerk-webhook: ${type} ${clerkOrgId}`)

  try {
    const { data: existing, error: findError } = await db
      .from("customers")
      .select("id")
      .eq("org_id", orgId)
      .eq("external_source", EXTERNAL_SOURCE)
      .eq("external_id", clerkOrgId)
      .maybeSingle()

    if (findError) {
      console.error(`systems-clerk-webhook: lookup failed for ${clerkOrgId}:`, findError)
      return json({ error: "Lookup failed" }, 500)
    }

    if (type === "organization.created") {
      if (existing) return json({ ok: true, existed: true })

      const name = data.name || data.slug || clerkOrgId
      const { error } = await db.from("customers").insert({
        org_id: orgId,
        name,
        external_source: EXTERNAL_SOURCE,
        external_id: clerkOrgId,
      })
      // 23505 = a concurrent retry won the race on the unique index. Success.
      if (error && error.code !== "23505") {
        console.error(`systems-clerk-webhook: insert failed for ${clerkOrgId}:`, error)
        return json({ error: "Insert failed" }, 500)
      }
      return json({ ok: true })
    }

    if (!existing) return json({ ok: true, skipped: "not_linked" })

    if (type === "organization.updated") {
      if (!data.name) return json({ ok: true, skipped: "no_name" })
      const { error } = await db
        .from("customers")
        .update({ name: data.name })
        .eq("id", existing.id)
        .eq("org_id", orgId)
      if (error) {
        console.error(`systems-clerk-webhook: update failed for ${clerkOrgId}:`, error)
        return json({ error: "Update failed" }, 500)
      }
      return json({ ok: true })
    }

    // organization.deleted — archive, never delete.
    const { error } = await db
      .from("customers")
      .update({ is_archived: true })
      .eq("id", existing.id)
      .eq("org_id", orgId)
    if (error) {
      console.error(`systems-clerk-webhook: archive failed for ${clerkOrgId}:`, error)
      return json({ error: "Archive failed" }, 500)
    }
    return json({ ok: true })
  } catch (err) {
    console.error(`systems-clerk-webhook: ${type} ${clerkOrgId} error:`, err)
    return json({ error: "Internal error" }, 500)
  }
})
