import { normalizeCustomFields, toStoredLineItems, type CustomField, type LineItem } from "@travada-books/core";
import { format } from "date-fns";
import type { InvoiceSettings } from "@/components/invoices/invoice-settings-sheet";
import { api, unwrap } from "@/lib/api";

// Invoice and payment writes through the API (API-WRITES-PLAN.md domain 1).
// Used only when apiWritesEnabled("invoices") is on; otherwise the pages keep
// their direct Supabase writes. The API computes totals, snapshots, FX and
// status itself, and runs multi-step actions (create + recurring series) in
// one transaction — the app only sends what the user entered.

/** The editor state the create and edit pages already hold. */
export type InvoiceFormState = {
  customerId: string;
  invoiceNumber: string;
  currency: string;
  issueDate: Date | undefined;
  dueDate: Date | undefined;
  items: LineItem[];
  discountType: "%" | "fixed";
  discountValue: string;
  vatRate: string;
  paymentDetails: string;
  notes: string;
  customFields: CustomField[];
  settings: InvoiceSettings;
  recurring: string;
  recurringEnds: { type: "never" | "on_date" | "after_count"; onDate: Date | null; afterCount: number | null } | null;
};

const day = (d: Date | undefined | null) => (d ? format(d, "yyyy-MM-dd") : null);
const numberOrNull = (value: string) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
};

/** Form state → the API's save input (minus the action). */
export function toInvoiceDocument(form: InvoiceFormState) {
  const discount = numberOrNull(form.discountValue);
  return {
    customer_id: form.customerId,
    invoice_number: form.invoiceNumber.trim() || undefined,
    currency: form.currency,
    issue_date: day(form.issueDate),
    due_date: day(form.dueDate),
    line_items: toStoredLineItems(form.items),
    discount: discount != null && discount > 0 ? { type: form.discountType, value: discount } : null,
    vat_rate: numberOrNull(form.vatRate),
    payment_details: form.paymentDetails,
    note: form.notes,
    custom_fields: normalizeCustomFields(form.customFields),
    settings: {
      accept_payments: form.settings.acceptPaymentsEnabled,
      partial_payments: form.settings.partialPayments ?? null,
      include_pdf: form.settings.includePdf,
      invoice_template: form.settings.invoiceTemplate,
      date_format: form.settings.dateFormat,
      show_tax_column: form.settings.showTaxColumn,
      show_qty_column: form.settings.showQtyColumn,
    },
    recurring: {
      frequency: form.recurring as "one_time" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly",
      end_type: form.recurringEnds?.type ?? "never",
      end_on_date: form.recurringEnds?.type === "on_date" ? day(form.recurringEnds.onDate) : null,
      end_after_count: form.recurringEnds?.type === "after_count" ? form.recurringEnds.afterCount : null,
    },
  };
}

export type SaveAction = "draft" | "send" | "schedule";

/** The recurring dialog's end settings → InvoiceFormState.recurringEnds. */
export function recurringEndsFrom(
  settings: { endsType: "on" | "after" | "never"; endsOnDate: Date | undefined; endsAfterCount: string } | null,
): InvoiceFormState["recurringEnds"] {
  if (!settings) return null;
  if (settings.endsType === "on") return { type: "on_date", onDate: settings.endsOnDate ?? null, afterCount: null };
  if (settings.endsType === "after") {
    return { type: "after_count", onDate: null, afterCount: parseInt(settings.endsAfterCount, 10) || null };
  }
  return { type: "never", onDate: null, afterCount: null };
}

/** A fresh key per user action, so a retried request can't run twice. */
const idem = () => ({ headers: { "Idempotency-Key": crypto.randomUUID() } });

export const invoiceApi = {
  create: (form: InvoiceFormState, action: SaveAction, scheduleAt?: Date) =>
    unwrap(
      api.v1.invoices.$post(
        { json: { ...toInvoiceDocument(form), action, schedule_at: scheduleAt?.toISOString() } },
        idem(),
      ),
    ),

  update: (id: string, form: InvoiceFormState, action: SaveAction, scheduleAt?: Date) =>
    unwrap(
      api.v1.invoices[":id"].$patch(
        { param: { id }, json: { ...toInvoiceDocument(form), action, schedule_at: scheduleAt?.toISOString() } },
        idem(),
      ),
    ),

  issue: (id: string, channel: "email" | "whatsapp" | "link" | "pdf" | "manual") =>
    unwrap(api.v1.invoices[":id"].issue.$post({ param: { id }, json: { channel } }, idem())),

  resendEmail: (id: string) => unwrap(api.v1.invoices[":id"].resend.$post({ param: { id } }, idem())),
  remind: (id: string) => unwrap(api.v1.invoices[":id"].remind.$post({ param: { id } }, idem())),
  duplicate: (id: string) => unwrap(api.v1.invoices[":id"].duplicate.$post({ param: { id } }, idem())),
  unschedule: (id: string) => unwrap(api.v1.invoices[":id"].unschedule.$post({ param: { id } })),
  cancel: (id: string) => unwrap(api.v1.invoices[":id"].cancel.$post({ param: { id } })),
  reopen: (id: string) => unwrap(api.v1.invoices[":id"].reopen.$post({ param: { id } })),
  markPaid: (id: string) => unwrap(api.v1.invoices[":id"]["mark-paid"].$post({ param: { id } }, idem())),
  remove: (id: string) => unwrap(api.v1.invoices[":id"].$delete({ param: { id } })),

  updateMeta: (id: string, meta: { internal_note?: string; skip_auto_reminder?: boolean }) =>
    unwrap(api.v1.invoices[":id"].meta.$patch({ param: { id }, json: meta })),

  setRecurringStatus: (seriesId: string, status: "active" | "paused" | "canceled") =>
    unwrap(api.v1["invoice-recurring"][":id"].status.$post({ param: { id: seriesId }, json: { status } })),

  recordPayment: (input: {
    invoice_id: string;
    amount: number;
    paid_at?: string;
    method: "mpesa" | "bank_transfer" | "cash" | "card" | "cheque" | "other";
    reference?: string | null;
    note?: string | null;
  }) => unwrap(api.v1.payments.$post({ json: input }, idem())),

  deletePayment: (paymentId: string) => unwrap(api.v1.payments[":id"].$delete({ param: { id: paymentId } })),
};
