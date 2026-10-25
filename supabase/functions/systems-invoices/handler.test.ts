import { test } from "node:test"
import assert from "node:assert/strict"
import { createHandler } from "./handler.ts"

function fixture({ customer = { id: "customer", is_archived: false }, invoices = [], periods = [], signError = null, error = null }: any = {}) {
  const calls: any[] = []
  const signed: string[] = []
  const db: any = {
    from(table: string) {
      const chain: any = {}
      for (const method of ["select", "eq", "in", "or", "order", "range"]) chain[method] = (...args: any[]) => { calls.push([table, method, ...args]); return chain }
      const result = table === "customers" ? { data: customer } : table === "invoices" ? { data: invoices, count: invoices.length, error } : { data: periods }
      chain.maybeSingle = async () => result
      chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject)
      return chain
    },
    storage: { from: () => ({ createSignedUrl: async (path: string) => { signed.push(path); return { data: { signedUrl: "https://storage.invalid/signed" }, error: signError } } }) },
  }
  const env = (key: string) => ({ BOOKS_PORTAL_API_SECRET: "secret", SYSTEMS_BOOKS_ORG_ID: "fixed-org", APP_URL: "https://books.invalid" })[key]
  return { handler: createHandler(db, env), db, calls, signed, env }
}
const request = (params = "", auth = "Bearer secret", method = "GET") => new Request(`https://books.invalid/systems-invoices?clerk_org_id=org_session${params}`, { method, headers: { Authorization: auth } })

test("authentication, method and pagination validation precede all queries", async () => {
  const { handler, calls } = fixture()
  for (const [req, status] of [[request("", "Bearer wrong"), 401], [request("", "", "POST"), 405], [request("&page=0"), 400], [request("&limit=101"), 400], [request("&page=1x"), 400]] as const) {
    const res = await handler(req); assert.equal(res.status, status); assert.equal(res.headers.get("Cache-Control"), "no-store")
  }
  assert.equal(calls.length, 0)
})
test("missing configuration fails closed", async () => {
  const { db } = fixture()
  assert.equal((await createHandler(db, () => undefined)(request())).status, 503)
})
test("unknown and archived customers return 404", async () => {
  for (const customer of [null, { id: "archived", is_archived: true }]) {
    const { handler, calls } = fixture({ customer })
    assert.equal((await handler(request())).status, 404)
    assert.ok(calls.every(([table]) => table === "customers"))
  }
})
test("empty issued history has valid pagination", async () => {
  const { handler } = fixture()
  assert.deepEqual(await (await handler(request())).json(), { data: [], pagination: { currentPage: 1, limit: 50, totalCount: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false } })
})
test("all lookups are scoped, drafts excluded, deterministic pagination and public URLs", async () => {
  const invoice = { id: "invoice", invoice_number: "TRV-1", issue_date: "2026-10-01", total: 236.88, currency: "USD", status: "unpaid", token: "invoice-token", file_path: "fixed-org/invoices/invoice/TRV-1.pdf" }
  const { handler, calls, signed } = fixture({ invoices: [invoice], periods: [{ invoice_id: "invoice", period_start: "2026-07-01", period_end: "2026-10-01" }] })
  const res = await handler(request("&page=2&limit=1&org_id=attacker"))
  const body = await res.json()
  assert.equal(res.status, 200)
  assert.equal(body.data[0].public_url, "https://books.invalid/i/invoice-token")
  assert.equal(body.data[0].amount_billed, "236.88")
  assert.equal(body.data[0].service_period, "1 Jul 2026 – 30 Sept 2026")
  assert.equal(body.data[0].pdf_url, "https://storage.invalid/signed")
  assert.deepEqual(signed, [invoice.file_path])
  for (const table of ["customers", "invoices", "systems_billing_runs"]) assert.ok(calls.some((c) => JSON.stringify(c) === JSON.stringify([table, "eq", "org_id", "fixed-org"])))
  assert.ok(calls.some((c) => JSON.stringify(c) === JSON.stringify(["invoices", "eq", "customer_id", "customer"])))
  const statuses = calls.find(([table, method]) => table === "invoices" && method === "in")[3]
  assert.ok(!statuses.includes("draft") && !statuses.includes("scheduled"))
  assert.ok(calls.some((c) => JSON.stringify(c) === JSON.stringify(["invoices", "range", 1, 1])))
  assert.ok(!calls.some(([table, method]) => table === "invoices" && method === "or"), "history must include older paid invoices")
  assert.ok(!("token" in body.data[0]) && !("file_path" in body.data[0]))
})
test("PDF signing is nullable and never signs another invoice's path", async () => {
  for (const path of [null, "other-org/invoices/other/private.pdf", "fixed-org/invoices/invoice/../other.pdf"]) {
    const { handler, signed } = fixture({ invoices: [{ id: "invoice", total: 1, file_path: path }] })
    assert.equal((await (await handler(request())).json()).data[0].pdf_url, null)
    assert.equal(signed.length, 0)
  }
})
