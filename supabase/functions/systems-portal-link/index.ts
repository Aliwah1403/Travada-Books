import { db } from "../_shared/db.ts"

const APP_URL = Deno.env.get("APP_URL") ?? "https://app.travadabooks.com"
const EXTERNAL_SOURCE = "travada_systems"

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
}

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const aBytes = enc.encode(a)
  const bBytes = enc.encode(b)
  if (aBytes.length !== bBytes.length) return false
  let diff = 0
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i]
  return diff === 0
}

Deno.serve(async (req) => {
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405)

  const secret = Deno.env.get("BOOKS_PORTAL_API_SECRET") ?? ""
  if (!secret) {
    console.error("systems-portal-link: BOOKS_PORTAL_API_SECRET is not set")
    return json({ error: "Service unavailable" }, 503)
  }
  const orgId = Deno.env.get("SYSTEMS_BOOKS_ORG_ID") ?? ""
  if (!orgId) {
    console.error("systems-portal-link: SYSTEMS_BOOKS_ORG_ID is not set — refusing request")
    return json({ error: "Server misconfigured" }, 500)
  }

  const auth = req.headers.get("Authorization") ?? ""
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : ""
  if (!timingSafeEqual(provided, secret)) return json({ error: "Unauthorized" }, 401)

  const clerkOrgId = new URL(req.url).searchParams.get("clerk_org_id") ?? ""
  if (!clerkOrgId) return json({ error: "clerk_org_id required" }, 400)

  try {
    const { data: customer, error } = await db
      .from("customers")
      .select("id, is_archived, portal_enabled, portal_id")
      .eq("org_id", orgId)
      .eq("external_source", EXTERNAL_SOURCE)
      .eq("external_id", clerkOrgId)
      .maybeSingle()

    if (error) {
      console.error(`systems-portal-link: lookup failed for ${clerkOrgId}:`, error)
      return json({ error: "Lookup failed" }, 500)
    }
    if (!customer || customer.is_archived) return json({ error: "not_found" }, 404)

    let portalId = customer.portal_id as string | null

    if (!customer.portal_enabled || !portalId) {
      // Same id generator the app's set_customer_portal() RPC uses
      // (public.generate_portal_id: 16 random bytes, url-safe base64). That RPC
      // itself checks auth.uid() membership, so call the generator directly
      // and write the same two columns it writes. Keeps an existing id.
      if (!portalId) {
        const { data: newId, error: idError } = await db.rpc("generate_portal_id")
        if (idError || !newId) {
          console.error(`systems-portal-link: generate_portal_id failed for ${clerkOrgId}:`, idError)
          return json({ error: "Could not create portal" }, 500)
        }
        portalId = newId as string
      }

      let query = db
        .from("customers")
        .update(customer.portal_id ? { portal_enabled: true } : { portal_enabled: true, portal_id: portalId })
        .eq("id", customer.id)
        .eq("org_id", orgId)
      // Only claim the id if nobody else has set one meanwhile.
      if (!customer.portal_id) query = query.is("portal_id", null)
      const { error: updateError } = await query

      if (updateError) {
        console.error(`systems-portal-link: enable failed for ${clerkOrgId}:`, updateError)
        return json({ error: "Could not enable portal" }, 500)
      }

      // Re-read so we return whatever id actually won.
      const { data: fresh } = await db
        .from("customers")
        .select("portal_id")
        .eq("id", customer.id)
        .eq("org_id", orgId)
        .single()
      portalId = (fresh?.portal_id as string | null) ?? portalId
    }

    return json({ url: `${APP_URL}/p/${portalId}` })
  } catch (err) {
    console.error(`systems-portal-link: error for ${clerkOrgId}:`, err)
    return json({ error: "Internal error" }, 500)
  }
})
