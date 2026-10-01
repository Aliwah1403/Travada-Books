import type { LedgerEntry, Participant, StatementPdfData } from "../types";

// Unlike buildInvoiceDocumentData/buildQuoteDocumentData, this does not take
// a raw statement row: the two current call sites (pages/statements/detail.tsx
// and pages/statement-public/token.tsx) build their ledger entries and format
// their dates with genuinely different logic (org-configured date format vs.
// a hardcoded dd/MM/yyyy on the public page — see the Phase 1 report), so
// that business logic intentionally stays at the call site in Phase 1. This
// mapper only consolidates the final StatementPdfData shape assembly, which
// was already identical between the two callers.
export interface BuildStatementDocumentDataOpts {
  currency: string;
  from: Participant;
  customer: Participant;
  statementDate: string;
  dateFrom: string;
  dateTo: string;
  entries: LedgerEntry[];
  notes: string | null;
  publicUrl?: string | null;
  /** Balance carried in from before the statement period. Defaults to 0 —
   * every legacy statement (and any caller that hasn't been updated yet). */
  openingBalance?: number;
}

export function buildStatementDocumentData(
  opts: BuildStatementDocumentDataOpts,
): StatementPdfData {
  return {
    currency: opts.currency,
    from: opts.from,
    customer: opts.customer,
    statementDate: opts.statementDate,
    dateFrom: opts.dateFrom,
    dateTo: opts.dateTo,
    entries: opts.entries,
    notes: opts.notes,
    publicUrl: opts.publicUrl ?? null,
    openingBalance: opts.openingBalance ?? 0,
  };
}
