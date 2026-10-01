// Shared document-data types consumed by the invoice/quote and statement PDF
// templates (and by the matching HTML previews in apps/app, which import
// these from here — see components/invoice-templates/classic/preview.tsx).

export type LineItem = {
  description: string;
  quantity: number;
  price: number;
  tax_rate: number;
};

export type CustomField = { id: string; label: string; value: string };

export type Participant = {
  name?: string | null;
  logo_url?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  zip?: string | null;
  country?: string | null;
  country_code?: string | null;
  phone?: string | null;
  email?: string | null;
  billing_email?: string | null;
  tax_id?: string | null;
};

export type ClassicDocumentData = {
  label?: string;
  number: string | null;
  currency: string;
  issueDate: string | null;
  secondaryDate?: string | null;
  secondaryDateLabel?: string;
  from: Participant;
  customer: Participant;
  customerLabel?: string;
  lineItems: LineItem[];
  subtotal: number | null;
  taxAmount: number | null;
  discount: number | null;
  total: number | null;
  note: string | null;
  paymentDetails?: string | null;
  publicUrl?: string | null;
  customFields?: CustomField[] | null;
  // Org/invoice `date_format` setting (e.g. "DD/MM/YYYY") — resolved to a
  // date-fns pattern via resolveDateFnsPattern (ledger.ts). Quotes have no
  // such setting and leave this undefined, which resolves to the same
  // dd/MM/yyyy default as before.
  dateFormat?: string | null;
  // Org/invoice `show_tax_column` / `show_qty_column` settings. Quotes and
  // any invoice row saved before these settings existed leave both
  // undefined/null, which must render exactly as before this feature: both
  // columns shown.
  showTaxColumn?: boolean | null;
  showQtyColumn?: boolean | null;
  // Invoice status, used only to show a CANCELED marker near the title.
  // Quotes never set this — leave it undefined to stay unaffected.
  status?: string | null;
};

export type LedgerEntry = {
  date: string;
  description: string;
  invoiceNumber: string | null;
  debit: number;
  credit: number;
  balance: number;
};

export type StatementPdfData = {
  currency: string;
  from: Participant;
  customer: Participant;
  statementDate: string;
  dateFrom: string;
  dateTo: string;
  entries: LedgerEntry[];
  notes: string | null;
  publicUrl: string | null;
  /** Balance carried in from before the statement period. 0 for legacy
   * statements generated before opening balances existed. */
  openingBalance: number;
};
