// Single fan-out entrypoint for all inbox notifications, routed by `event`.
// Dual auth like notify-team-joined: worker calls (X-Worker-Secret) skip JWT
// validation entirely; everything else must present a user JWT AND belong to
// the target org (organization_members lookup by user_id, equality-only —
// never touches the recursion-sensitive SELECT policy).
//
// Worker fires this for the match-outcome events (inbox.auto_matched,
// inbox.needs_review, inbox.cross_currency_matched) plus inbox.new from
// inbound email. Web fires it for inbox.match_confirmed and inbox.new from
// manual upload. All routing/fan-out logic lives in
// ../_shared/notify-inbox.ts, shared with inbox-webhook/index.ts.

import { createClient } from "npm:@supabase/supabase-js@2"
import { db } from "../_shared/db.ts"
import { fanOutInboxNotification, INBOX_EVENTS, type InboxEvent } from "../_shared/notify-inbox.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const WORKER_SHARED_SECRET = Deno.env.get("WORKER_SHARED_SECRET") ?? ""
const VALID_EVENTS = new Set<InboxEvent>(INBOX_EVENTS)

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
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const workerSecret = req.headers.get("X-Worker-Secret") ?? ""
    const calledByWorker =
      WORKER_SHARED_SECRET.length > 0 && timingSafeEqual(workerSecret, WORKER_SHARED_SECRET)

    let callerId: string | null = null
    if (!calledByWorker) {
      const authorization = req.headers.get("Authorization")
      if (!authorization) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders })
      }

      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authorization } } },
      )
      const { data: { user }, error: authError } = await userClient.auth.getUser()
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders })
      }
      callerId = user.id
    }

    const body = await req.json().catch(() => null)
    const event = body?.event as InboxEvent | undefined
    const orgId = body?.orgId as string | undefined

    if (!event || !VALID_EVENTS.has(event)) {
      return new Response(JSON.stringify({ error: "Invalid event" }), { status: 400, headers: corsHeaders })
    }
    if (!orgId) {
      return new Response(JSON.stringify({ error: "orgId required" }), { status: 400, headers: corsHeaders })
    }

    // Non-worker callers must be an active member of the org they're
    // notifying about — equality filter only, safe against the
    // organization_members SELECT-policy recursion trap.
    if (!calledByWorker) {
      const { data: membership } = await db
        .from("organization_members")
        .select("user_id")
        .eq("org_id", orgId)
        .eq("user_id", callerId!)
        .eq("status", "active")
        .maybeSingle()

      if (!membership) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders })
      }
    }

    const { event: _event, orgId: _orgId, ...payload } = body as Record<string, unknown>
    await fanOutInboxNotification(event, orgId, payload)

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
  } catch (err) {
    console.error("notify-inbox error:", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
