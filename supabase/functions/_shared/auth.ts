import { createClient } from "npm:@supabase/supabase-js@2"
import { db } from "./db.ts"

const jsonHeaders = { "Content-Type": "application/json" }

export async function getCallerOrgId(req: Request): Promise<{ orgId: string; userId: string } | { error: Response }> {
  const authorization = req.headers.get("Authorization")
  if (!authorization) {
    return { error: new Response(JSON.stringify({ error: "Missing authorization header" }), { status: 401, headers: jsonHeaders }) }
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authorization } } },
  )

  const { data: { user }, error } = await userClient.auth.getUser()
  if (error || !user) {
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders }) }
  }

  const { data: userRow, error: userError } = await db
    .from("users")
    .select("active_org_id")
    .eq("id", user.id)
    .single()

  if (userError) {
    console.error("getCallerOrgId: user lookup failed:", userError.message)
    return { error: new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: jsonHeaders }) }
  }

  if (!userRow?.active_org_id) {
    return { error: new Response(JSON.stringify({ error: "No active organization membership" }), { status: 403, headers: jsonHeaders }) }
  }

  // Verify the cached active_org_id still has an active membership row —
  // active_org_id is denormalized and could drift if membership was revoked.
  const { data: member, error: memberError } = await db
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("org_id", userRow.active_org_id)
    .eq("status", "active")
    .single()

  if (memberError || !member) {
    return { error: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: jsonHeaders }) }
  }

  return { orgId: member.org_id, userId: user.id }
}
