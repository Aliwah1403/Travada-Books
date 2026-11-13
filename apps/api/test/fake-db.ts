import type { SupabaseClient } from "@supabase/supabase-js"

// A small stand-in for the Supabase query builder. It records every call
// (tagged with the query it belongs to, so tests can check that *each* query
// was org-filtered) and answers from in-memory tables. Only eq filters are
// applied to reads; the other filters are recorded but don't narrow results.
export type Call = { query: number; table: string; method: string; args: unknown[] }

type Row = Record<string, unknown>

export function createFakeDb(tables: Record<string, Row[]> = {}, rpcResults: Record<string, unknown> = {}) {
  const calls: Call[] = []
  let nextQuery = 0

  const from = (table: string) => {
    const query = ++nextQuery
    const filters: [string, unknown][] = []
    let pending: { kind: "insert"; rows: Row[] } | { kind: "update"; values: Row } | { kind: "delete" } | null = null

    const matching = () => (tables[table] ?? []).filter((row) => filters.every(([col, val]) => row[col] === val))
    const result = (): Row[] => {
      if (pending?.kind === "insert") {
        const inserted = pending.rows.map((row) => ({ id: crypto.randomUUID(), ...row }))
        ;(tables[table] ??= []).push(...inserted)
        return inserted
      }
      if (pending?.kind === "update") {
        const rows = matching()
        for (const row of rows) Object.assign(row, pending.values)
        return rows
      }
      if (pending?.kind === "delete") {
        const rows = matching()
        tables[table] = (tables[table] ?? []).filter((row) => !rows.includes(row))
        return rows
      }
      return matching()
    }

    const builder: Record<string, unknown> = {}
    const record = (method: string, args: unknown[]) => calls.push({ query, table, method, args })
    const chain =
      (method: string) =>
      (...args: unknown[]) => {
        record(method, args)
        if (method === "eq") filters.push([args[0] as string, args[1]])
        if (method === "insert") pending = { kind: "insert", rows: args[0] as Row[] }
        if (method === "update") pending = { kind: "update", values: args[0] as Row }
        if (method === "delete") pending = { kind: "delete" }
        return builder
      }
    for (const method of ["select", "insert", "update", "delete", "eq", "neq", "in", "not", "is", "or", "gte", "lte", "ilike", "order", "range", "limit"]) {
      builder[method] = chain(method)
    }
    builder.maybeSingle = async () => ({ data: result()[0] ?? null, error: null })
    builder.single = async () => {
      const row = result()[0]
      return row ? { data: row, error: null } : { data: null, error: { message: "no rows" } }
    }
    builder.then = (resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) => {
      try {
        return Promise.resolve(resolve({ data: result(), error: null }))
      } catch (error) {
        return reject ? reject(error) : Promise.reject(error)
      }
    }
    return builder
  }

  const rpc = (fn: string, args: unknown) => {
    calls.push({ query: ++nextQuery, table: "(rpc)", method: fn, args: [args] })
    return Promise.resolve({ data: rpcResults[fn] ?? [], error: null })
  }

  // The tables ride along on the client so test helpers can reach them.
  const db = Object.assign({ from, rpc }, { __tables: tables }) as unknown as SupabaseClient
  return { db, calls, tables }
}

/** A Redis stand-in with the two commands the confirmation flow uses. */
export function createFakeRedis() {
  const store = new Map<string, string>()
  return {
    store,
    redis: {
      set: async (key: string, value: string) => {
        store.set(key, value)
        return "OK"
      },
      getDel: async (key: string) => {
        const value = store.get(key) ?? null
        store.delete(key)
        return value
      },
    },
  }
}
