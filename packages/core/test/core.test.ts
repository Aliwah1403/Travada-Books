import { describe, expect, it } from "vitest"
import {
  buildCustomerDetailsSnapshot,
  buildFromDetailsSnapshot,
  computeDocumentTotals,
  deriveVatRate,
  isPastValidUntil,
  isQuoteEditable,
  normalizeCustomFields,
  normalizePartialRules,
  parseCustomFields,
  resolveDocumentLogo,
  toRateColumns,
  toStoredLineItems,
  type LineItem,
} from "../src/index"

// These pin the behaviour the app had before the rules moved here. The API
// computes invoices with the same functions, so a change here changes both.

const line = (qty: string, rate: string, tax = ""): LineItem => ({ id: crypto.randomUUID(), description: "Work", qty, rate, tax })

describe("computeDocumentTotals", () => {
  it("adds lines with no tax or discount", () => {
    expect(computeDocumentTotals([line("2", "500"), line("1", "250")], "%", "", "")).toEqual({
      subtotal: 1250,
      tax_amount: 0,
      discount: 0,
      total: 1250,
    })
  })

  it("applies document VAT after a percentage discount", () => {
    // 10,000 − 10% = 9,000 taxable; 16% VAT = 1,440
    expect(computeDocumentTotals([line("1", "10000")], "%", "10", "16")).toEqual({
      subtotal: 10000,
      tax_amount: 1440,
      discount: 1000,
      total: 10440,
    })
  })

  it("adds per-line tax on the undiscounted line amount", () => {
    const totals = computeDocumentTotals([line("1", "1000", "16"), line("1", "1000")], "fixed", "200", "")
    expect(totals).toEqual({ subtotal: 2000, tax_amount: 160, discount: 200, total: 1960 })
  })

  it("never discounts below zero", () => {
    expect(computeDocumentTotals([line("1", "100")], "fixed", "500", "16")).toEqual({
      subtotal: 100,
      tax_amount: 0,
      discount: 100,
      total: 0,
    })
  })

  it("treats unparseable input as zero", () => {
    expect(computeDocumentTotals([line("abc", "100"), line("2", "")], "%", "x", "y").total).toBe(0)
  })
})

describe("toStoredLineItems", () => {
  it("converts editor rows to the stored shape", () => {
    expect(toStoredLineItems([line("2", "150.5", "16"), line("", "x")])).toEqual([
      { description: "Work", quantity: 2, price: 150.5, tax_rate: 16 },
      { description: "Work", quantity: 0, price: 0, tax_rate: 0 },
    ])
  })
})

describe("toRateColumns", () => {
  it("keeps a percentage discount and the VAT rate", () => {
    expect(toRateColumns("%", "12.5", "16")).toEqual({ vat_rate: 16, discount_percent: 12.5 })
  })
  it("doesn't store a percent for fixed discounts, and drops zero/blank", () => {
    expect(toRateColumns("fixed", "500", "")).toEqual({ vat_rate: null, discount_percent: null })
  })
  it("clamps to 100 and rounds to 2 places", () => {
    expect(toRateColumns("%", "150", "16.666")).toEqual({ vat_rate: 16.67, discount_percent: 100 })
  })
})

describe("deriveVatRate", () => {
  it("recovers a whole-number VAT rate from legacy totals", () => {
    expect(deriveVatRate({ lineItems: [{ quantity: 1, price: 10000, tax_rate: 0 }], subtotal: 10000, discount: 0, taxAmount: 1600 })).toBe(16)
  })
  it("returns null when all tax is per-line", () => {
    expect(deriveVatRate({ lineItems: [{ quantity: 1, price: 1000, tax_rate: 16 }], subtotal: 1000, discount: 0, taxAmount: 160 })).toBeNull()
  })
})

describe("snapshots", () => {
  const org = {
    name: "Acme Ltd",
    logo_url: "org.png",
    address_line1: "1 Road",
    address_line2: null,
    city: "Nairobi",
    zip: null,
    country_code: "KE",
    phone: null,
    email: "hi@acme.test",
    tax_id: "P051",
    tax_id_label: null,
  }

  it("prefers the template logo, then the org logo", () => {
    expect(resolveDocumentLogo("tpl.png", org)).toBe("tpl.png")
    expect(resolveDocumentLogo(null, org)).toBe("org.png")
    expect(resolveDocumentLogo(undefined, null)).toBeNull()
  })

  it("labels the tax ID only when there is one", () => {
    expect(buildFromDetailsSnapshot(org, "x.png")).toMatchObject({ name: "Acme Ltd", logo_url: "x.png", tax_id_label: "Tax ID" })
    expect(buildFromDetailsSnapshot({ ...org, tax_id: null }, null).tax_id_label).toBeNull()
  })

  it("fills missing customer fields with null", () => {
    expect(buildCustomerDetailsSnapshot({ name: "Beta" })).toEqual({
      name: "Beta",
      email: null,
      billing_email: null,
      billing_cc: null,
      phone: null,
      address_line1: null,
      address_line2: null,
      city: null,
      zip: null,
      country: null,
    })
  })
})

describe("custom fields", () => {
  it("trims, drops half-filled entries and caps at 8", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ id: String(i), label: ` L${i} `, value: "v" }))
    const out = normalizeCustomFields([{ id: "x", label: "PO", value: "  " }, ...many])
    expect(out).toHaveLength(8)
    expect(out[0]).toEqual({ id: "0", label: "L0", value: "v" })
  })
  it("parses only well-formed jsonb entries", () => {
    expect(parseCustomFields([{ id: "a", label: "PO", value: "42" }, { label: 1 }, null, "x"])).toEqual([{ id: "a", label: "PO", value: "42" }])
    expect(parseCustomFields("nope")).toEqual([])
  })
})

describe("quotes", () => {
  it("only drafts and declined quotes are editable", () => {
    expect(["draft", "declined"].every(isQuoteEditable)).toBe(true)
    expect(["sent", "accepted", "expired"].some(isQuoteEditable)).toBe(false)
  })
  it("a quote stays valid through its valid-until day", () => {
    expect(isPastValidUntil("2026-11-11", "2026-11-11")).toBe(false)
    expect(isPastValidUntil("2026-11-10", "2026-11-11")).toBe(true)
    expect(isPastValidUntil(null, "2026-11-11")).toBe(false)
  })
})

describe("normalizePartialRules", () => {
  it("clamps stored rules into range", () => {
    expect(normalizePartialRules({ enabled: true, min_percent: 150, max_payments: 1, deadline_days: 999 })).toMatchObject({
      enabled: true,
      min_percent: 100,
      max_payments: 2,
      deadline_days: 365,
    })
  })
})
