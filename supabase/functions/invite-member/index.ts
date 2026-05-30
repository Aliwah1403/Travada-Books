import React from "npm:react"
import { render } from "npm:@react-email/render@1"
import { resend, FROM_EMAIL } from "../_shared/resend.ts"
import { db } from "../_shared/db.ts"
import { getCallerOrgId } from "../_shared/auth.ts"
import { InviteEmail } from "../_shared/emails/invite.tsx"

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
    const { orgId } = auth

    const { emails, inviterName } = await req.json() as { emails: string[]; inviterName: string }
    if (!emails?.length) return new Response(JSON.stringify({ error: "emails required" }), { status: 400, headers: corsHeaders })

    // Fetch org name from DB
    const { data: org } = await db.from("organizations").select("name").eq("id", orgId).single()
    const orgName = org?.name ?? "your team"

    const acceptUrl = `${APP_URL}/signup`

    let sent = 0
    for (const email of emails) {
      try {
        const html = await render(
          React.createElement(InviteEmail, {
            invitedEmail: email,
            inviterName: inviterName || orgName,
            orgName,
            acceptUrl,
          })
        )

        await resend.emails.send({
          from: `Travada Books <${FROM_EMAIL}>`,
          to: [email],
          subject: `You've been invited to join ${orgName} on Travada Books`,
          html,
        })

        sent++
      } catch (emailErr) {
        console.error(`invite-member: failed to send to ${email}:`, emailErr)
      }
    }

    return new Response(JSON.stringify({ ok: true, sent }), { headers: corsHeaders })
  } catch (err) {
    console.error("invite-member error:", err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
