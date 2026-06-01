import React from "npm:react"
import { render } from "npm:@react-email/render@1"
import { createClient } from "npm:@supabase/supabase-js@2"
import { resend, FROM_EMAIL } from "../_shared/resend.ts"
import { db } from "../_shared/db.ts"
import { triggerNovu } from "../_shared/novu.ts"
import { shouldSend } from "../_shared/notification-prefs.ts"
import { TeamMemberJoinedEmail } from "../_shared/emails/team-member-joined.tsx"

const APP_URL = Deno.env.get("APP_URL") ?? "https://books.travadasys.com"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    // Verify the caller's JWT and extract their user ID
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

    const { memberId } = await req.json()
    if (!memberId) {
      return new Response(JSON.stringify({ error: "memberId required" }), { status: 400, headers: corsHeaders })
    }

    // Look up the membership — must be active and belong to the calling user
    const { data: member, error: memberError } = await db
      .from("organization_members")
      .select("user_id, org_id, role, team_joined_notified_at, users(email, full_name)")
      .eq("id", memberId)
      .eq("status", "active")
      .single()

    if (memberError || !member) {
      return new Response(JSON.stringify({ error: "Member not found" }), { status: 404, headers: corsHeaders })
    }

    // Verify the caller is the member who just joined — prevents anyone else triggering this
    if (member.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders })
    }

    // Idempotency guard — stamp before sending so concurrent calls can only fire once
    const { data: stamped } = await db
      .from("organization_members")
      .update({ team_joined_notified_at: new Date().toISOString() })
      .eq("id", memberId)
      .is("team_joined_notified_at", null)
      .select("id")

    if (!stamped?.length) {
      // Already notified — skip silently
      return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: corsHeaders })
    }

    type UserFields = { email: string; full_name: string | null } | null
    const newMemberUser = member.users as unknown as UserFields
    const memberName = newMemberUser?.full_name ?? newMemberUser?.email ?? "A team member"
    const memberEmail = newMemberUser?.email ?? ""
    const role = (member.role as string).charAt(0).toUpperCase() + (member.role as string).slice(1)
    const orgId = member.org_id as string

    const { data: org } = await db.from("organizations").select("email, name").eq("id", orgId).single()
    if (!org?.email) {
      return new Response(JSON.stringify({ error: "Business email not found" }), { status: 422, headers: corsHeaders })
    }

    const { data: owners } = await db
      .from("organization_members")
      .select("user_id, users(email)")
      .eq("org_id", orgId)
      .eq("role", "owner")
      .eq("status", "active")

    const settingsUrl = `${APP_URL}/settings/team`
    let emailSent = false

    for (const owner of owners ?? []) {
      // Don't notify the new member about themselves joining
      if (owner.user_id === member.user_id) continue

      const ownerEmail = (owner.users as unknown as UserFields)?.email
      if (!ownerEmail) continue

      const [canEmail, canInApp] = await Promise.all([
        shouldSend(owner.user_id, orgId, "team.joined", "email"),
        shouldSend(owner.user_id, orgId, "team.joined", "in_app"),
      ])

      if (canEmail && !emailSent) {
        const html = await render(
          React.createElement(TeamMemberJoinedEmail, {
            memberName,
            memberEmail,
            role,
            orgName: org.name,
            settingsUrl,
          })
        )
        await resend.emails.send({
          from: `Travada Books <${FROM_EMAIL}>`,
          to: [org.email],
          subject: `${memberName} joined ${org.name} on Travada Books`,
          html,
        })
        emailSent = true
      }

      if (canInApp) {
        triggerNovu("team-joined", { subscriberId: owner.user_id, email: ownerEmail }, {
          memberName,
          memberEmail,
          role,
          settingsUrl,
        }).catch((err) => console.error("notify-team-joined: novu trigger failed:", err))
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
  } catch (err) {
    console.error("notify-team-joined error:", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
