import type { SupabaseClient } from "npm:@supabase/supabase-js@2"

const ISSUED_STATUSES = ["unpaid", "partially_paid", "overdue", "paid", "canceled"]
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
})

function equalSecret(a: string, b: string): boolean {
  const encoder = new TextEncoder()
  const x = encoder.encode(a), y = encoder.encode(b)
  if (x.length !== y.length) return false
  let diff = 0
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i]
  return diff === 0
}

function positiveInteger(value: string | null, fallback: number, max: number): number | null {
  if (value === null) return fallback
  if (!/^[1-9]\d*$/.test(value)) return null
  const n = Number(value)
  return Number.isSafeInteger(n) && n <= max ? n : null
}

function formatPeriod(start: string, end: string): string {
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }
  const last = new Date(`${end}T00:00:00Z`)
  last.setUTCDate(last.getUTCDate() - 1)
  return `${new Date(`${start}T00:00:00Z`).toLocaleDateString("en-GB", options)} – ${last.toLocaleDateString("en-GB", options)}`
}

export function createHandler(db: SupabaseClient, env: (name: string) => string | undefined) {
  return async (req: Request): Promise<Response> => {
    if (req.method !== "GET") return json({ error: "Method not allowed" }, 405)
    const secret = env("BOOKS_PORTAL_API_SECRET")
    if (!secret) return json({ error: "Service unavailable" }, 503)
    const authorization = req.headers.get("Authorization") ?? ""
    if (!equalSecret(authorization.startsWith("Bearer ") ? authorization.slice(7) : "", secret)) return json({ error: "Unauthorized" }, 401)
    const orgId = env("SYSTEMS_BOOKS_ORG_ID")
    if (!orgId) return json({ error: "Server misconfigured" }, 500)
    const params = new URL(req.url).searchParams
    const clerkOrgId = params.get("clerk_org_id") ?? ""
    const page = positiveInteger(params.get("page"), 1, 1_000_000)
    const limit = positiveInteger(params.get("limit"), 50, 100)
    if (!/^org_[A-Za-z0-9_-]+$/.test(clerkOrgId) || page === null || limit === null) return json({ error: "Invalid clerk_org_id, page or limit" }, 400)
    try {
      const app = new URL(env("APP_URL") ?? "https://app.travadabooks.com")
      if (app.protocol !== "https:" && !(app.protocol === "http:" && ["localhost", "127.0.0.1"].includes(app.hostname))) throw new Error("Invalid APP_URL")
      const { data: customer, error: customerError } = await db.from("customers")
        .select("id, is_archived").eq("org_id", orgId)
        .eq("external_source", "travada_systems").eq("external_id", clerkOrgId).maybeSingle()
      if (customerError) throw customerError
      if (!customer || customer.is_archived) return json({ error: "not_found" }, 404)

      // Issued statuses match the portal; pagination keeps all historical paid invoices accessible.
      const { data: invoices, error, count } = await db.from("invoices")
        .select("id, invoice_number, issue_date, total, currency, status, token, file_path", { count: "exact" })
        .eq("org_id", orgId).eq("customer_id", customer.id).in("status", ISSUED_STATUSES)
        .order("issue_date", { ascending: false, nullsFirst: false }).order("id", { ascending: false })
        .range((page - 1) * limit, page * limit - 1)
      if (error) throw error
      const ids = (invoices ?? []).map((invoice) => invoice.id)
      const periods = new Map<string, { period_start: string; period_end: string }>()
      if (ids.length) {
        const { data: runs, error: runError } = await db.from("systems_billing_runs")
          .select("invoice_id, period_start, period_end").eq("org_id", orgId)
          .eq("customer_id", customer.id).eq("clerk_org_id", clerkOrgId).in("invoice_id", ids)
        if (runError) throw runError
        for (const run of runs ?? []) periods.set(run.invoice_id, run)
      }
      const data = await Promise.all((invoices ?? []).map(async (invoice) => {
        let pdfUrl: string | null = null
        // Never sign a path pointing at another invoice/customer's vault document.
        if (invoice.file_path?.startsWith(`${orgId}/invoices/${invoice.id}/`) && !invoice.file_path.split("/").some((part: string) => part === ".." || part === ".")) {
          const { data: signed, error: signError } = await db.storage.from("vault").createSignedUrl(invoice.file_path, 3600, { download: true })
          if (signError) console.error("systems-invoices: PDF unavailable", invoice.id)
          else if (signed?.signedUrl) {
            const link = new URL(signed.signedUrl)
            // Local Edge Runtime signs against Docker's internal Kong hostname.
            // An explicit public API origin makes the download browser-accessible.
            const publicApi = env("BOOKS_PUBLIC_API_URL")
            if (publicApi) {
              const publicOrigin = new URL(publicApi)
              if (publicOrigin.protocol !== "https:" && !(publicOrigin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(publicOrigin.hostname))) throw new Error("Invalid BOOKS_PUBLIC_API_URL")
              pdfUrl = `${publicOrigin.origin}${link.pathname}${link.search}`
            } else pdfUrl = link.href
          }
        }
        const period = periods.get(invoice.id)
        return {
          id: invoice.id, invoice_number: invoice.invoice_number, invoice_date: invoice.issue_date,
          service_period: period ? formatPeriod(period.period_start, period.period_end) : null,
          amount_billed: String(invoice.total), currency: invoice.currency, status: invoice.status,
          public_url: invoice.token ? `${app.origin}/i/${encodeURIComponent(invoice.token)}` : null,
          pdf_url: pdfUrl,
        }
      }))
      const totalCount = count ?? 0, totalPages = Math.ceil(totalCount / limit)
      return json({ data, pagination: { currentPage: page, totalPages, totalCount, limit, hasNextPage: page < totalPages, hasPrevPage: page > 1 } })
    } catch (error) {
      console.error("systems-invoices: read failed", error)
      return json({ error: "Could not load invoices" }, 500)
    }
  }
}
