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
};
