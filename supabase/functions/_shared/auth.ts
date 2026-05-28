import { createClient } from "npm:@supabase/supabase-js@2"
import { db } from "./db.ts"

export async function getCallerOrgId(req: Request): Promise<{ orgId: string } | { error: Response }> {
  const authorization = req.headers.get("Authorization")
  if (!authorization) {
    return { error: new Response(JSON.stringify({ error: "Missing authorization header" }), { status: 401 }) }
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authorization } } },
  )

  const { data: { user }, error } = await userClient.auth.getUser()
  if (error || !user) {
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) }
  }

  const { data: member } = await db
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single()

  if (!member) {
    return { error: new Response(JSON.stringify({ error: "No active organization membership" }), { status: 403 }) }
  }

  return { orgId: member.org_id }
}
