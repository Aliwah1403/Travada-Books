import type { SupabaseClient } from "@supabase/supabase-js"

// The one way API code reads or writes org data with the service-role client.
// The service role bypasses RLS, so the org filter is the only thing keeping
// one org's data away from another — this helper makes it impossible to forget.
//
// Phase 2 (assistant tools) builds on this: every tool gets a ScopedDb, never
// the raw client. Tables without an org_id column don't belong here.
export type ScopedDb = ReturnType<typeof scopeToOrg>

export function scopeToOrg(db: SupabaseClient, orgId: string) {
  if (!orgId) throw new Error("scopeToOrg: orgId is required")

  return {
    orgId,
    // Column lists are plain strings here, so rows come back untyped; each tool
    // documents the columns it reads.
    select: (table: string, columns = "*") => db.from(table).select(columns as "*").eq("org_id", orgId),
    insert: <Row extends Record<string, unknown>>(table: string, rows: Row | Row[]) =>
      db.from(table).insert((Array.isArray(rows) ? rows : [rows]).map((row) => ({ ...row, org_id: orgId }))),
    update: (table: string, values: Record<string, unknown>) => {
      // Never let a caller move a row to another org.
      const { org_id: _ignored, ...rest } = values
      return db.from(table).update(rest).eq("org_id", orgId)
    },
    delete: (table: string) => db.from(table).delete().eq("org_id", orgId),
    // RPCs must take the org explicitly; this passes it so callers can't omit it.
    rpc: (fn: string, args: Record<string, unknown> = {}) => db.rpc(fn, { ...args, p_org_id: orgId }),
  }
}
