import type { ClassicDocumentData, CustomField, LineItem, Participant } from "../types";

// The subset of an invoice row (org-scoped `Invoice` or the public
// `getInvoiceByToken` result — both select the same columns off the
// `invoices` table) that the PDF template's field layout actually reads.
// `from`/`customer`/`customFields`/`publicUrl` are resolved by the caller
// (thin per-page adapter) because the *source* of those values genuinely
// differs between call sites (live org context vs. the invoice's stored
// from_details/customer_details snapshot) — see DOCUMENT-PDF-PLAN.md Phase 1
// and the Phase 1 implementation report for the exact divergences preserved.
export interface InvoiceDocumentDataRow {
  invoice_number: string | null;
  currency: string;
  issue_date: string | null;
  due_date: string | null;
  line_items: LineItem[] | null;
  subtotal: number | null;
  tax_amount: number | null;
  discount: number | null;
  total: number | null;
  note: string | null;
  payment_details: string | null;
}

export interface BuildInvoiceDocumentDataOpts {
  from: Participant;
  customer: Participant;
  customFields?: CustomField[] | null;
  publicUrl?: string | null;
}

export function buildInvoiceDocumentData(
  invoice: InvoiceDocumentDataRow,
  opts: BuildInvoiceDocumentDataOpts,
): ClassicDocumentData {
  return {
    label: "INVOICE",
    number: invoice.invoice_number,
    currency: invoice.currency,
    issueDate: invoice.issue_date,
    secondaryDate: invoice.due_date,
    secondaryDateLabel: "Due date:",
    from: opts.from,
    customer: opts.customer,
    customerLabel: "Bill To",
    lineItems: invoice.line_items ?? [],
    subtotal: invoice.subtotal,
    taxAmount: invoice.tax_amount,
    discount: invoice.discount,
    total: invoice.total,
    note: invoice.note,
    paymentDetails: invoice.payment_details,
    customFields: opts.customFields ?? null,
    publicUrl: opts.publicUrl ?? null,
  };
}
