import { getCallerOrgId } from "../_shared/auth.ts"
import { encryptOAuthState } from "../_shared/crypto.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const auth = await getCallerOrgId(req)
    if ("error" in auth) {
      return new Response(auth.error.body, { status: auth.error.status, headers: corsHeaders })
    }

    const { orgId } = auth
    const { provider } = await req.json() as { provider?: string }

    if (provider !== "gmail") {
      return new Response(JSON.stringify({ error: "unsupported provider" }), { status: 400, headers: jsonHeaders })
    }

    const state = await encryptOAuthState({ orgId, provider: "gmail" })

    const params = new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      redirect_uri: Deno.env.get("GOOGLE_OAUTH_REDIRECT_URI")!,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email openid",
      access_type: "offline",
      prompt: "consent",
      state,
    })

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

    return new Response(JSON.stringify({ url }), { headers: jsonHeaders })
  } catch (err) {
    console.error("inbox-connect error:", err)
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: jsonHeaders })
  }
})
