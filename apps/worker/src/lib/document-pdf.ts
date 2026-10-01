// Shared "load the row + render it" pieces for invoice/quote/statement PDFs —
// used by `generate-document-pdf.ts` (renders one document, uploads it,
// registers it in the Vault, optionally emails it) and by the org data
// export (`org-export.ts`, which renders every un-stored sent
// invoice/quote/statement into the ZIP, read-only, no upload). Keeping the
// load+render logic here means both call sites use the exact same row
// selects, date-format resolution, and ledger building —
// `generate-document-pdf.ts`'s behaviour is unchanged by this move.
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  renderInvoicePdf,
  renderQuotePdf,
  renderStatementPdf,
  resolveLogoDataUrl,
  type InvoicePdfRow,
  type QuotePdfRow,
  type StatementPdfRow,
} from "@travada-books/pdf/server";
import { buildStatementLedger, formatServerDate, resolveDateFnsPattern } from "@travada-books/pdf";

export const APP_URL = process.env.APP_URL ?? "https://books.travadasys.com";

export type LogoResolver = (url: string) => Promise<string | null>;

// Memoizes resolveLogoDataUrl per URL, so a whole batch of renders (e.g.
// every document in an org export) fetches/decodes a given logo at most
// once instead of once per document.
export function createLogoCache(): LogoResolver {
  const cache = new Map<string, Promise<string | null>>();
  return (url: string) => {
    let entry = cache.get(url);
    if (!entry) {
      entry = resolveLogoDataUrl(url);
      cache.set(url, entry);
    }
    return entry;
  };
}

// Storage paths embed the human-readable number/date range, which can
// contain characters that don't belong in a storage key (spaces, slashes if
// someone hand-edited an invoice number, etc).
export function sanitizeFilenamePart(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 150) || "document";
}

type RenderOpts = { resolveLogo?: LogoResolver };

// ── Invoice ──────────────────────────────────────────────────────────────

const INVOICE_PDF_SELECT =
  "id, org_id, user_id, token, invoice_number, currency, issue_date, due_date, line_items, subtotal, tax_amount, discount, total, note, payment_details, from_details, customer_details, customer_name, custom_fields, date_format, show_tax_column, show_qty_column, status";

export type InvoiceForPdf = InvoicePdfRow & {
  id: string;
  org_id: string;
  user_id: string | null;
  token: string | null;
  invoice_number: string | null;
  issue_date: string | null;
};

export async function loadInvoiceForPdf(
  supabase: SupabaseClient,
  invoiceId: string,
): Promise<InvoiceForPdf> {
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(INVOICE_PDF_SELECT)
    .eq("id", invoiceId)
    .single();

  if (error || !invoice) throw new Error(`Invoice ${invoiceId} not found: ${error?.message ?? "no data"}`);
  return invoice as unknown as InvoiceForPdf;
}

export async function renderInvoiceBuffer(row: InvoiceForPdf, opts: RenderOpts = {}): Promise<Buffer> {
  return renderInvoicePdf(row, {
    publicUrl: row.token ? `${APP_URL}/i/${row.token}` : null,
    resolveLogo: opts.resolveLogo,
  });
}

// ── Quote ────────────────────────────────────────────────────────────────

const QUOTE_PDF_SELECT =
  "id, org_id, user_id, token, quote_number, currency, issue_date, valid_until, line_items, subtotal, tax_amount, discount, total, note, from_details, customer_details, customer_name, custom_fields";

export type QuoteForPdf = QuotePdfRow & {
  id: string;
  org_id: string;
  user_id: string | null;
  token: string | null;
  quote_number: string | null;
  issue_date: string | null;
};

export async function loadQuoteForPdf(supabase: SupabaseClient, quoteId: string): Promise<QuoteForPdf> {
  const { data: quote, error } = await supabase
    .from("quotes")
    .select(QUOTE_PDF_SELECT)
    .eq("id", quoteId)
    .single();

  if (error || !quote) throw new Error(`Quote ${quoteId} not found: ${error?.message ?? "no data"}`);
  return quote as unknown as QuoteForPdf;
}

export async function renderQuoteBuffer(row: QuoteForPdf, opts: RenderOpts = {}): Promise<Buffer> {
  return renderQuotePdf(row, {
    publicUrl: row.token ? `${APP_URL}/q/${row.token}` : null,
    resolveLogo: opts.resolveLogo,
  });
}

// ── Statement ────────────────────────────────────────────────────────────

const STATEMENT_SELECT =
  "id, org_id, token, date_from, date_to, notes, snapshot_data, from_details, customer_details, created_at, opening_balance, payments_snapshot";

export type StatementForPdf = {
  id: string;
  org_id: string;
  token: string | null;
  date_from: string;
  date_to: string;
  notes: string | null;
  snapshot_data: unknown;
  from_details: Record<string, unknown> | null;
  customer_details: Record<string, unknown> | null;
  created_at: string;
  opening_balance: number;
  payments_snapshot: unknown;
};

export async function loadStatementForPdf(
  supabase: SupabaseClient,
  statementId: string,
): Promise<StatementForPdf> {
  const { data: statement, error } = await supabase
    .from("statements")
    .select(STATEMENT_SELECT)
    .eq("id", statementId)
    .single();

  if (error || !statement) throw new Error(`Statement ${statementId} not found: ${error?.message ?? "no data"}`);
  return statement as unknown as StatementForPdf;
}

// No per-viewer profile in a server render — use the org's default
// invoice_templates.date_format (fallback to the same default the app
// uses). Statements share invoice_templates rather than having their own.
async function buildStatementRenderRow(
  supabase: SupabaseClient,
  statement: StatementForPdf,
): Promise<StatementPdfRow> {
  const { data: template } = await supabase
    .from("invoice_templates")
    .select("date_format")
    .eq("org_id", statement.org_id)
    .eq("is_default", true)
    .maybeSingle();
  const pattern = resolveDateFnsPattern((template?.date_format as string | undefined) ?? null);
  const formatDate = (value: string) => formatServerDate(value, pattern);

  const snapshot = Array.isArray(statement.snapshot_data) ? statement.snapshot_data : [];
  // payments_snapshot is null for statements generated before opening
  // balances existed — buildStatementLedger switches to the legacy
  // per-invoice amount_paid path in that case, matching the app's readers.
  const payments = Array.isArray(statement.payments_snapshot) ? statement.payments_snapshot : null;
  const openingBalance = statement.opening_balance ?? 0;
  const entries = buildStatementLedger(snapshot, {
    dateTo: statement.date_to,
    formatDate,
    openingBalance,
    payments,
  });
  const currency =
    (snapshot[0] as { currency?: string } | undefined)?.currency ??
    (payments?.[0] as { currency?: string } | undefined)?.currency ??
    "KES";

  return {
    from_details: statement.from_details,
    customer_details: statement.customer_details,
    currency,
    statementDate: formatDate(statement.created_at),
    dateFrom: formatDate(statement.date_from),
    dateTo: formatDate(statement.date_to),
    entries,
    notes: statement.notes,
    openingBalance,
  };
}

export async function renderStatementBuffer(
  supabase: SupabaseClient,
  statement: StatementForPdf,
  opts: RenderOpts = {},
): Promise<Buffer> {
  const row = await buildStatementRenderRow(supabase, statement);
  return renderStatementPdf(row, {
    publicUrl: statement.token ? `${APP_URL}/s/${statement.token}` : null,
    resolveLogo: opts.resolveLogo,
  });
}
