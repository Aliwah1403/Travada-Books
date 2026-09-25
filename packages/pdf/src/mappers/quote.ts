import type { ClassicDocumentData, CustomField, LineItem, Participant } from "../types";

// See InvoiceDocumentDataRow's comment — same reasoning applies here.
export interface QuoteDocumentDataRow {
  quote_number: string | null;
  currency: string;
  issue_date: string | null;
  valid_until: string | null;
  line_items: LineItem[] | null;
  subtotal: number | null;
  tax_amount: number | null;
  discount: number | null;
  total: number | null;
  note: string | null;
}

export interface BuildQuoteDocumentDataOpts {
  from: Participant;
  customer: Participant;
  customFields?: CustomField[] | null;
  publicUrl?: string | null;
}

export function buildQuoteDocumentData(
  quote: QuoteDocumentDataRow,
  opts: BuildQuoteDocumentDataOpts,
): ClassicDocumentData {
  return {
    label: "QUOTATION",
    number: quote.quote_number,
    currency: quote.currency,
    issueDate: quote.issue_date,
    secondaryDate: quote.valid_until,
    secondaryDateLabel: "Valid until:",
    from: opts.from,
    customer: opts.customer,
    customerLabel: "Prepared For",
    lineItems: quote.line_items ?? [],
    subtotal: quote.subtotal,
    taxAmount: quote.tax_amount,
    discount: quote.discount,
    total: quote.total,
    note: quote.note,
    customFields: opts.customFields ?? null,
    publicUrl: opts.publicUrl ?? null,
  };
}
