import type { SupabaseClient } from "@supabase/supabase-js"

// A tiny stand-in for the Supabase query builder. It records every call so
// tests can assert on filters, and answers reads from in-memory tables.
export type Call = { table: string; method: string; args: unknown[] }

export function createFakeDb(tables: Record<string, Record<string, unknown>[]> = {}) {
  const calls: Call[] = []

  const from = (table: string) => {
    const filters: [string, unknown][] = []
    const rows = () => (tables[table] ?? []).filter((row) => filters.every(([col, val]) => row[col] === val))
    const builder: Record<string, unknown> = {}
    const chain =
      (method: string) =>
      (...args: unknown[]) => {
        calls.push({ table, method, args })
        if (method === "eq") filters.push([args[0] as string, args[1]])
        return builder
      }
    for (const method of ["select", "insert", "update", "delete", "eq", "limit"]) builder[method] = chain(method)
    builder.maybeSingle = async () => ({ data: rows()[0] ?? null, error: null })
    builder.single = async () => {
      const row = rows()[0]
      return row ? { data: row, error: null } : { data: null, error: { message: "no rows" } }
    }
    builder.then = (resolve: (value: unknown) => unknown) => resolve({ data: rows(), error: null })
    return builder
  }

  const rpc = (fn: string, args: unknown) => {
    calls.push({ table: "(rpc)", method: fn, args: [args] })
    return Promise.resolve({ data: null, error: null })
  }

  return { db: { from, rpc } as unknown as SupabaseClient, calls }
}
