// State and calculations for the free invoice generator (/invoice-generator).
// Everything stays in the browser. Only `import type` from the root of
// @travada-books/pdf here: its runtime pulls in react-pdf, which has to stay
// out of the route chunk (see downloadInvoicePdf).
import { createElement } from "react"

import type { ClassicDocumentData } from "@travada-books/pdf"
// The subpath, not the root: the root entry would pull react-pdf into the route chunk.
import { TAX_ID_LABELS } from "@travada-books/pdf/document-view"

export { TAX_ID_LABELS }

export const CURRENCIES = [
  { value: "USD", label: "USD · US dollar" },
  { value: "EUR", label: "EUR · Euro" },
  { value: "GBP", label: "GBP · British pound" },
  { value: "KES", label: "KES · Kenyan shilling" },
  { value: "UGX", label: "UGX · Ugandan shilling" },
  { value: "TZS", label: "TZS · Tanzanian shilling" },
  { value: "RWF", label: "RWF · Rwandan franc" },
  { value: "ETB", label: "ETB · Ethiopian birr" },
  { value: "NGN", label: "NGN · Nigerian naira" },
  { value: "GHS", label: "GHS · Ghanaian cedi" },
  { value: "ZAR", label: "ZAR · South African rand" },
  { value: "EGP", label: "EGP · Egyptian pound" },
  { value: "AED", label: "AED · UAE dirham" },
  { value: "SAR", label: "SAR · Saudi riyal" },
  { value: "INR", label: "INR · Indian rupee" },
  { value: "CAD", label: "CAD · Canadian dollar" },
  { value: "AUD", label: "AUD · Australian dollar" },
  { value: "CHF", label: "CHF · Swiss franc" },
  { value: "JPY", label: "JPY · Japanese yen" },
  { value: "CNY", label: "CNY · Chinese yuan" },
]

export type DraftItem = { id: string; description: string; quantity: string; price: string; taxRate: string }

export type Draft = {
  business: {
    name: string
    logo: string | null
    address: string
    city: string
    country: string
    phone: string
    email: string
    taxId: string
    taxIdLabel: string
  }
  customer: { name: string; address: string; city: string; country: string; email: string }
  number: string
  issueDate: string
  dueDate: string
  currency: string
  items: DraftItem[]
  discount: string
  note: string
  paymentDetails: string
}

export function newItem(id = `line-${Math.random().toString(36).slice(2, 10)}`): DraftItem {
  return { id, description: "", quantity: "1", price: "", taxRate: "" }
}

// What gets prerendered: dates are left empty so the HTML doesn't depend on
// the day it was built. defaultDraft fills them in on the client.
export const BLANK_DRAFT: Draft = {
  business: { name: "", logo: null, address: "", city: "", country: "", phone: "", email: "", taxId: "", taxIdLabel: "Tax ID" },
  customer: { name: "", address: "", city: "", country: "", email: "" },
  number: "INV-0001",
  issueDate: "",
  dueDate: "",
  currency: "USD",
  items: [newItem("line-1")],
  discount: "",
  note: "",
  paymentDetails: "",
}

function isoDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function defaultDraft(today = new Date()): Draft {
  const due = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30)
  return { ...BLANK_DRAFT, items: [newItem("line-1")], issueDate: isoDate(today), dueDate: isoDate(due) }
}

// ── Storage. Every access can throw (private windows, blocked site data). ──

const STORAGE_KEY = "travada:invoice-generator:draft"

const isString = (value: unknown): value is string => typeof value === "string"

function strings<T extends Record<string, unknown>>(base: T, stored: unknown): T {
  const out: Record<string, unknown> = { ...base }
  if (stored && typeof stored === "object") {
    for (const key of Object.keys(base)) {
      const value = (stored as Record<string, unknown>)[key]
      if (isString(value)) out[key] = value
    }
  }
  return out as T
}

export function readStoredDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const stored = JSON.parse(raw) as Partial<Draft>
    const base = defaultDraft()
    const logo = stored.business?.logo
    const items = Array.isArray(stored.items)
      ? stored.items.map((item) => strings(newItem(), item))
      : []
    return {
      ...strings(
        {
          number: base.number,
          issueDate: base.issueDate,
          dueDate: base.dueDate,
          discount: "",
          note: "",
          paymentDetails: "",
        },
        stored,
      ),
      business: {
        ...strings({ ...base.business, logo: undefined }, stored.business),
        taxIdLabel: TAX_ID_LABELS.find((l) => l === stored.business?.taxIdLabel) ?? "Tax ID",
        logo: isString(logo) && /^data:image\/(png|jpeg);base64,/.test(logo) ? logo : null,
      },
      customer: strings(base.customer, stored.customer),
      currency: CURRENCIES.some((c) => c.value === stored.currency) ? (stored.currency as string) : base.currency,
      items: items.length ? items : base.items,
    }
  } catch {
    return null
  }
}

export function storeDraft(draft: Draft) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  } catch {
    // Storage full or blocked: the page keeps working, the draft just won't
    // survive a reload.
  }
}

export function clearStoredDraft() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to clear if storage is blocked.
  }
}

// ── Logo ──

export const MAX_LOGO_BYTES = 1024 * 1024

// react-pdf can only draw PNG and JPG. The browser's `file.type` comes from
// the file extension, so a renamed WebP is caught by its first bytes instead.
export function readLogoFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type !== "image/png" && file.type !== "image/jpeg") {
      reject(new Error("Use a PNG or JPG logo."))
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      reject(new Error("Use a logo of 1 MB or smaller."))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("We couldn't read that file. Try another one."))
    reader.onload = () => {
      const url = String(reader.result ?? "")
      const body = url.slice(url.indexOf(",") + 1)
      if (body.startsWith("iVBOR") || body.startsWith("/9j/")) resolve(url)
      else reject(new Error("Use a PNG or JPG logo."))
    }
    reader.readAsDataURL(file)
  })
}

// ── Calculations ──

function toNumber(value: string) {
  const n = Number.parseFloat(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}

const round2 = (n: number) => Math.round(n * 100) / 100
const text = (value: string) => value.trim() || null
const joined = (values: string[]) => values.map((v) => v.trim()).filter(Boolean)

// A row counts once it has a description or a price; empty rows are dropped.
function usedItems(draft: Draft) {
  return draft.items.filter((item) => item.description.trim() || toNumber(item.price) > 0)
}

// The one document both the preview and the PDF are drawn from. `publicUrl:
// null` is what keeps the QR code and any online link off the PDF.
export function toDocumentData(draft: Draft): ClassicDocumentData {
  const { business, customer } = draft
  const lineItems = usedItems(draft).map((item) => ({
    description: item.description.trim(),
    quantity: toNumber(item.quantity),
    price: toNumber(item.price),
    tax_rate: toNumber(item.taxRate),
  }))
  const subtotal = round2(lineItems.reduce((sum, i) => sum + i.quantity * i.price, 0))
  const taxAmount = round2(lineItems.reduce((sum, i) => sum + i.quantity * i.price * (i.tax_rate / 100), 0))
  const discount = round2(toNumber(draft.discount))

  return {
    template: "classic",
    label: "INVOICE",
    number: text(draft.number),
    currency: draft.currency,
    issueDate: text(draft.issueDate),
    secondaryDate: text(draft.dueDate),
    secondaryDateLabel: "Due date:",
    customerLabel: "Bill To",
    // Classic's header prints only address, city, email and the tax number, so
    // country and phone travel inside those two or they would never reach the PDF.
    from: {
      name: text(business.name),
      logo_url: business.logo,
      address_line1: text(business.address),
      city: joined([business.city, business.country]).join(", ") || null,
      email: joined([business.phone, business.email]).join("  ·  ") || null,
      tax_id: text(business.taxId),
      tax_id_label: business.taxIdLabel,
    },
    customer: {
      name: text(customer.name),
      address_line1: text(customer.address),
      city: text(customer.city),
      country: text(customer.country),
      email: text(customer.email),
    },
    lineItems,
    subtotal,
    taxAmount,
    discount,
    total: round2(subtotal + taxAmount - discount),
    note: text(draft.note),
    paymentDetails: text(draft.paymentDetails),
    publicUrl: null,
    showQtyColumn: true,
    showTaxColumn: lineItems.some((i) => i.tax_rate > 0),
  }
}

export const itemFieldId = (id: string) => `generator-item-${id}-description`

// Keyed by input id, in page order, so the first key is the field to focus.
export function validateDraft(draft: Draft): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!draft.business.name.trim()) errors["generator-business-name"] = "Enter your business name."
  if (!draft.customer.name.trim()) errors["generator-customer-name"] = "Enter who this invoice is for."

  const used = usedItems(draft)
  if (!used.some((item) => item.description.trim())) {
    errors[itemFieldId((used[0] ?? draft.items[0]).id)] = "Add at least one line with a description."
  }
  for (const item of used) {
    if (!item.description.trim()) errors[itemFieldId(item.id)] = "Add a description for this line."
  }

  const { subtotal, taxAmount, discount } = toDocumentData(draft)
  if ((discount ?? 0) > (subtotal ?? 0) + (taxAmount ?? 0)) {
    errors["generator-discount"] = "The discount can't be more than the invoice total."
  }
  return errors
}

export function totalBucket(total: number) {
  if (total < 100) return "<100"
  if (total < 1_000) return "100-1k"
  if (total < 10_000) return "1k-10k"
  if (total < 100_000) return "10k-100k"
  return "100k+"
}

// ── PDF ──

function pdfFilename(number: string | null) {
  const safe = (number ?? "").replace(/[\\/:*?"<>|]/g, "-").trim()
  return `${safe || "invoice"}.pdf`
}

// react-pdf is heavy and browser-only, so it loads on the first download and
// never during prerender. Same approach as apps/app/src/lib/pdf-download.ts.
export async function downloadInvoicePdf(data: ClassicDocumentData) {
  const [{ pdf }, { InvoicePdf }] = await Promise.all([import("@react-pdf/renderer"), import("@travada-books/pdf")])
  const element = createElement(InvoicePdf, { data }) as unknown as Parameters<typeof pdf>[0]
  const blob = await pdf(element).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = pdfFilename(data.number)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
