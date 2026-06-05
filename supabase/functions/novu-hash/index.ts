import { createClient } from "npm:@supabase/supabase-js@2"

const jsonHeaders = { "Content-Type": "application/json" }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    })
  }

  const authorization = req.headers.get("Authorization")
  if (!authorization) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders })
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authorization } } },
  )

  const { data: { user }, error } = await userClient.auth.getUser()
  if (error || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders })
  }

  const secretKey = Deno.env.get("NOVU_SECRET_KEY")
  if (!secretKey) {
    console.error("novu-hash: NOVU_SECRET_KEY is not set")
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), { status: 500, headers: jsonHeaders })
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(user.id))
  const hash = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

  return new Response(JSON.stringify({ hash }), {
    headers: {
      ...jsonHeaders,
      "Access-Control-Allow-Origin": "*",
    },
  })
})
