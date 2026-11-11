import type { SupabaseClient } from "@supabase/supabase-js"
import type { Caller, TokenVerifier } from "./lib/auth.js"
import type { Analytics } from "./lib/posthog.js"
import type { Redis } from "./lib/redis.js"
import type { ScopedDb } from "./lib/scoped.js"

// Everything a request handler can reach. Built once in index.ts and passed to
// createApp, so tests can swap in fakes without touching env or the network.
export type Deps = {
  serviceDb: SupabaseClient
  redis: Pick<Redis, "ping" | "set" | "getDel">
  verifyToken: TokenVerifier
  analytics: Analytics
  /** The web app's origin, for links in tool results (invoice pages, /i/:token). */
  appUrl: string
}

export type AppEnv = {
  Variables: {
    deps: Deps
    // Set by requireCaller on authenticated routes only.
    caller: Caller
    db: ScopedDb
  }
}
