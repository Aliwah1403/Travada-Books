import React from "npm:react"
import { render } from "npm:@react-email/render@1"
import { resend, FROM_EMAIL } from "../_shared/resend.ts"
import { db } from "../_shared/db.ts"
import { getCallerOrgId } from "../_shared/auth.ts"
import { shouldSend } from "../_shared/notification-prefs.ts"
import { InviteEmail } from "../_shared/emails/invite.tsx"
import { TeamMemberInvitedEmail } from "../_shared/emails/team-member-invited.tsx"

const APP_URL = Deno.env.get("APP_URL") ?? "https://books.travadasys.com"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const auth = await getCallerOrgId(req)
    if ("error" in auth) return new Response(auth.error.body, { status: auth.error.status, headers: corsHeaders })
    const { orgId, userId: actingUserId } = auth

    const body = await req.json() as {
      invitations?: Array<{ email: string; id: string }>
      emails?: string[]
      inviterName: string
    }
    const { inviterName } = body

    // Support both new (invitations array with ids) and legacy (emails-only) callers
    const rawInvitations: Array<{ email: string; id?: string }> =
      body.invitations ?? (body.emails ?? []).map((email) => ({ email }))

    if (!Array.isArray(rawInvitations) || rawInvitations.length === 0) {
      return new Response(JSON.stringify({ error: "invitations required" }), { status: 400, headers: corsHeaders })
    }
    if (rawInvitations.length > 50) {
      return new Response(JSON.stringify({ error: "Too many invitations; maximum is 50" }), { status: 400, headers: corsHeaders })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const seen = new Set<string>()
    const invitations: Array<{ email: string; id?: string }> = []
    for (const inv of rawInvitations) {
      const normalized = (inv.email ?? "").trim().toLowerCase()
      if (!normalized || !emailRegex.test(normalized) || seen.has(normalized)) continue
      seen.add(normalized)
      invitations.push({ ...inv, email: normalized })
    }

    if (!invitations.length) return new Response(JSON.stringify({ error: "No valid invitation emails provided" }), { status: 400, headers: corsHeaders })

    // Fetch org name from DB
    const { data: org } = await db.from("organizations").select("name").eq("id", orgId).single()
    const orgName = org?.name ?? "your team"

    let sent = 0
    for (let i = 0; i < invitations.length; i++) {
      const inv = invitations[i]
      try {
        const acceptUrl = inv.id
          ? `${APP_URL}/accept-invite?token=${inv.id}`
          : `${APP_URL}/signup`

        const html = await render(
          React.createElement(InviteEmail, {
            invitedEmail: inv.email,
            inviterName: inviterName || orgName,
            orgName,
            acceptUrl,
          })
        )

        await resend.emails.send({
          from: `Travada Books <${FROM_EMAIL}>`,
          to: [inv.email],
          subject: `You've been invited to join ${orgName} on Travada Books`,
          html,
        })

        sent++
      } catch (emailErr) {
        console.error(`invite-member: failed to send invitation ${i} (id: ${inv.id ?? "none"}):`, emailErr)
      }
    }

    // Notify all other owners that invitations were sent
    if (invitations.length > 0) {
      try {
        const { data: owners } = await db
          .from("organization_members")
          .select("user_id, users(email, full_name)")
          .eq("org_id", orgId)
          .eq("role", "owner")
          .eq("status", "active")

        type OwnerFields = { email: string; full_name: string | null } | null
        const { data: orgData } = await db.from("organizations").select("email, name").eq("id", orgId).single()

        for (const owner of owners ?? []) {
          const ownerUser = owner.users as unknown as OwnerFields
          if (!ownerUser?.email || !orgData?.email) continue

          const canEmail = await shouldSend(owner.user_id, orgId, "team.invited", "email")
          if (!canEmail) continue

          // Send one summary email per other owner listing all invited emails
          const invitedList = invitations.map((i) => i.email).join(", ")
          const firstInvitation = invitations[0]
          const role = firstInvitation
            ? await db
                .from("organization_members")
                .select("role")
                .eq("id", firstInvitation.id ?? "")
                .maybeSingle()
                .then(({ data }) => data?.role ?? "Member")
            : "Member"

          const html = await render(
            React.createElement(TeamMemberInvitedEmail, {
              invitedEmail: invitations.length === 1 ? invitations[0].email : invitedList,
              role: role.charAt(0).toUpperCase() + role.slice(1),
              orgName,
              settingsUrl: `${APP_URL}/settings/team`,
            })
          )

          await resend.emails.send({
            from: `Travada Books <${FROM_EMAIL}>`,
            to: [orgData.email],
            subject: `Invitation sent to ${invitations.length === 1 ? invitations[0].email : `${invitations.length} people`}`,
            html,
          })
        }
      } catch (notifyErr) {
        console.error("invite-member: owner notification failed:", notifyErr)
      }
    }

    return new Response(JSON.stringify({ ok: true, sent }), { headers: corsHeaders })
  } catch (err) {
    console.error("invite-member error:", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
