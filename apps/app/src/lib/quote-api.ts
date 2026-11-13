import { normalizeCustomFields, toStoredLineItems, type CustomField, type LineItem } from "@travada-books/core";
import { format } from "date-fns";
import { api, unwrap } from "@/lib/api";
import type { SendChannel } from "@/lib/send-channels";

// Quote writes through the API (API-WRITES-PLAN.md domain 2). Used only when
// apiWritesEnabled("quotes") is on; otherwise the pages keep their direct
// Supabase writes. The API computes totals, FX, snapshots and status itself
// — the app only sends what the user entered.

/** The editor state the create and edit pages already hold. */
export type QuoteFormState = {
  customerId: string;
  quoteNumber: string;
  currency: string;
  issueDate: Date | undefined;
  validUntil: Date | undefined;
  items: LineItem[];
  discountType: "%" | "fixed";
  discountValue: string;
  vatRate: string;
  notes: string;
  customFields: CustomField[];
  settings: { includePdf: boolean; quoteTemplate: string };
};

const day = (d: Date | undefined | null) => (d ? format(d, "yyyy-MM-dd") : null);
const numberOrNull = (value: string) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
};

/** Form state → the API's save input (minus the action). */
export function toQuoteDocument(form: QuoteFormState) {
  const discount = numberOrNull(form.discountValue);
  return {
    customer_id: form.customerId,
    quote_number: form.quoteNumber.trim() || undefined,
    currency: form.currency,
    issue_date: day(form.issueDate),
    // Always explicit: the page already applied the template's validity
    // period, and a cleared date means no expiry.
    valid_until: day(form.validUntil),
    line_items: toStoredLineItems(form.items),
    discount: discount != null && discount > 0 ? { type: form.discountType, value: discount } : null,
    vat_rate: numberOrNull(form.vatRate),
    note: form.notes,
    custom_fields: normalizeCustomFields(form.customFields),
    settings: { include_pdf: form.settings.includePdf, quote_template: form.settings.quoteTemplate },
  };
}

/** A fresh key per user action, so a retried request can't run twice. */
const idem = () => ({ headers: { "Idempotency-Key": crypto.randomUUID() } });

export const quoteApi = {
  create: (form: QuoteFormState, action: "draft" | "send") =>
    unwrap(api.v1.quotes.$post({ json: { ...toQuoteDocument(form), action } }, idem())),

  update: (id: string, form: QuoteFormState, action: "draft" | "send" = "draft") =>
    unwrap(api.v1.quotes[":id"].$patch({ param: { id }, json: { ...toQuoteDocument(form), action } }, idem())),

  issue: (id: string, channel: SendChannel) =>
    unwrap(api.v1.quotes[":id"].issue.$post({ param: { id }, json: { channel } }, idem())),

  resendEmail: (id: string) => unwrap(api.v1.quotes[":id"].resend.$post({ param: { id } }, idem())),
  duplicate: (id: string) => unwrap(api.v1.quotes[":id"].duplicate.$post({ param: { id } }, idem())),
  accept: (id: string) => unwrap(api.v1.quotes[":id"].accept.$post({ param: { id } }, idem())),
  decline: (id: string, reason: string | null) =>
    unwrap(api.v1.quotes[":id"].decline.$post({ param: { id }, json: { reason } }, idem())),
  convert: (id: string) => unwrap(api.v1.quotes[":id"].convert.$post({ param: { id } }, idem())),
  remove: (id: string) => unwrap(api.v1.quotes[":id"].$delete({ param: { id } })),

  updateMeta: (id: string, meta: { internal_note: string }) =>
    unwrap(api.v1.quotes[":id"].meta.$patch({ param: { id }, json: meta })),
};
