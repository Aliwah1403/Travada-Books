import { z } from "zod"
import { ToolError } from "./types.js"

// MCP clients choke on huge text blocks; Midday caps at 25k characters too.
export const TEXT_LIMIT = 25_000

export const pagination = {
  limit: z.number().int().min(1).max(100).optional().describe("Max rows to return (default 25, max 100)"),
  offset: z.number().int().min(0).optional().describe("Rows to skip, for the next page (default 0)"),
}

export const dateRange = {
  from: z.iso.date().describe("Start date, YYYY-MM-DD (inclusive)"),
  to: z.iso.date().describe("End date, YYYY-MM-DD (inclusive)"),
}

export const uuid = (what: string) => z.uuid().describe(`${what} ID`)

export function page(args: { limit?: number; offset?: number }) {
  const limit = args.limit ?? 25
  const offset = args.offset ?? 0
  return { limit, offset, from: offset, to: offset + limit - 1 }
}

/**
 * List payload with a next-page hint. Drops rows from the end until the JSON
 * fits TEXT_LIMIT and says so, so the model knows to page instead of
 * assuming it saw everything.
 */
export function listResult<T>(rows: T[], paging: { limit: number; offset: number }, extra: Record<string, unknown> = {}) {
  const hasMore = rows.length === paging.limit
  let data = rows
  let truncated = false
  const build = () => ({
    ...extra,
    count: data.length,
    offset: paging.offset,
    next_offset: hasMore || truncated ? paging.offset + data.length : null,
    ...(truncated ? { note: "Response truncated to fit; use next_offset to continue." } : {}),
    data,
  })
  while (data.length > 1 && JSON.stringify(build()).length > TEXT_LIMIT) {
    data = data.slice(0, -1)
    truncated = true
  }
  return build()
}

/** Unwraps a Supabase response, turning errors into ToolErrors. */
export function must<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`${what}: ${result.error.message}`)
  if (result.data === null) throw new ToolError(`${what}: not found`)
  return result.data
}

/** Escapes PostgREST filter metacharacters and LIKE wildcards in user text. */
export function likeTerm(term: string): string {
  return `%${term.replace(/[%_\\,()*]/g, " ").trim()}%`
}

export function formatMoney(amount: number, currency: string, locale = "en"): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

/** Today and common range starts, in the user's timezone. */
export function dateContext(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
  const [year, month] = parts.split("-").map(Number) as [number, number]
  const quarterMonth = Math.floor((month - 1) / 3) * 3 + 1
  const pad = (n: number) => String(n).padStart(2, "0")
  return {
    today: parts,
    monthStart: `${year}-${pad(month)}-01`,
    quarterStart: `${year}-${pad(quarterMonth)}-01`,
    yearStart: `${year}-01-01`,
    quarter: Math.ceil(month / 3),
    year,
  }
}
