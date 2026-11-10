// What every invoice/quote layout derives from the document data, shared by
// the PDF templates here and the HTML previews in apps/app, so a layout only
// decides where things go.
import { normalizeCustomFields } from "./custom-fields";
import { formatServerDate, resolveDateFnsPattern } from "./ledger";
import type { ClassicDocumentData, Participant } from "./types";

export const DOCUMENT_TEMPLATES = [
  { id: "classic", label: "Classic" },
  { id: "ledger", label: "Ledger" },
  { id: "banded", label: "Banded" },
  { id: "mono", label: "Mono" },
] as const;

export type DocumentTemplateId = (typeof DOCUMENT_TEMPLATES)[number]["id"];

// Older rows can hold ids from layouts that were never built; they render as
// Classic, the same way they always have.
export function normalizeDocumentTemplate(id: string | null | undefined): DocumentTemplateId {
  return DOCUMENT_TEMPLATES.find((t) => t.id === id)?.id ?? "classic";
}

export function formatMoney(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "0.00";
  return n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Line amounts are qty × price (before tax), so the rows add up to the
// Subtotal printed under them.
export function getDocumentView(data: ClassicDocumentData) {
  const datePattern = resolveDateFnsPattern(data.dateFormat);
  const subtotal =
    data.subtotal ?? data.lineItems.reduce((s, i) => s + i.quantity * i.price, 0);
  const tax =
    data.taxAmount ??
    data.lineItems.reduce((s, i) => s + i.quantity * i.price * (i.tax_rate / 100), 0);
  const discount = data.discount ?? 0;

  return {
    label: data.label ?? "INVOICE",
    customerLabel: data.customerLabel ?? "Bill To",
    secondaryDateLabel: (data.secondaryDateLabel ?? "Due date:").replace(":", "").trim(),
    isQuote: data.label === "QUOTATION",
    noun: data.label === "QUOTATION" ? "Quote" : "Invoice",
    formatDate: (d: string | null | undefined) => formatServerDate(d, datePattern),
    // NULL means "saved before these settings existed": both columns shown.
    showQty: data.showQtyColumn ?? true,
    showTax: data.showTaxColumn ?? true,
    subtotal,
    tax,
    discount,
    total: data.total ?? subtotal + tax - discount,
    customFields: normalizeCustomFields(data.customFields ?? []),
  };
}

export function addressLines(p: Participant) {
  return [
    p.address_line1,
    p.address_line2,
    [p.city, p.zip].filter(Boolean).join(" "),
    p.country ?? p.country_code,
  ].filter((line): line is string => Boolean(line));
}

// Names the business tax number can carry. "Tax ID" is the neutral default.
export const TAX_ID_LABELS = ["Tax ID", "VAT", "PIN", "TIN", "GST"] as const;

// "<label>: <id>" for the business tax number, or null without one. Snapshots
// saved before labels existed carry none and keep printing "PIN".
export function taxIdLine(p: Pick<Participant, "tax_id" | "tax_id_label">) {
  const id = p.tax_id?.trim();
  if (!id) return null;
  return `${p.tax_id_label?.trim() || "PIN"}: ${id}`;
}

export function contactLines(p: Participant) {
  return [p.phone, p.billing_email ?? p.email].filter((line): line is string => Boolean(line));
}
