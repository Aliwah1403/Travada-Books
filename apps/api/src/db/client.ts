import { and, eq, type SQL } from "drizzle-orm"
import { drizzle } from "drizzle-orm/postgres-js"
import type { PgColumn } from "drizzle-orm/pg-core"
import postgres from "postgres"
import * as schema from "./schema.js"

// Direct Postgres for the API's writes (API-WRITES-PLAN.md D2): one action =
// one transaction. Reads in the MCP tools still go through supabase-js.
//
// Production URL: Supabase's pooler in *transaction* mode (port 6543), which
// doesn't support prepared statements — hence prepare: false. Locally: the
// stack's Postgres on 127.0.0.1:54322.
export function createDb(url: string) {
  const client = postgres(url, {
    prepare: false,
    max: 10,
    // Keep connections open between requests: a new one to the pooler costs a
    // TCP + TLS + auth handshake, several round trips from Render (Singapore)
    // to Supabase (Sydney). Recycled every 30 minutes regardless.
    idle_timeout: 600,
    max_lifetime: 30 * 60,
    connect_timeout: 10,
  })
  const db = drizzle(client, { schema, casing: "snake_case" })
  return { db, close: () => client.end({ timeout: 5 }) }
}

export type Db = ReturnType<typeof createDb>["db"]
/** A Drizzle transaction handle, for services that take part in one. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0]
export type DbOrTx = Db | Tx

// The Drizzle twin of lib/scoped.ts. The API connects as a role that bypasses
// RLS, so the org filter is what keeps one org's data from another's. Every
// service query on an org-owned table goes through these.

type OrgTable = { orgId: PgColumn }

/** WHERE org_id = $orgId AND …the rest. */
export function inOrg(table: OrgTable, orgId: string, ...conditions: (SQL | undefined)[]): SQL {
  if (!orgId) throw new Error("inOrg: orgId is required")
  return and(eq(table.orgId, orgId), ...conditions) as SQL
}

/** Stamps org_id on rows to insert, overriding anything supplied. */
export function withOrg<Row extends Record<string, unknown>>(orgId: string, row: Row): Row & { orgId: string } {
  if (!orgId) throw new Error("withOrg: orgId is required")
  return { ...row, orgId }
}
