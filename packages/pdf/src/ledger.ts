// Statement ledger builder — the event-sequencing + running-balance logic
// that used to be duplicated as a private `buildLedger` function in
// apps/app/src/pages/statements/detail.tsx (and, separately and
// intentionally left alone, in pages/statement-public/token.tsx — see
// DOCUMENT-PDF-PLAN.md Phase 2). Consolidated here so apps/worker's
// generate-document-pdf task can build the exact same statement ledger the
// app renders, for attached-PDF generation.
//
// Formatting is injected via `formatDate` rather than baked in as a fixed
// pattern: the app passes its own timezone/profile-aware formatter (from
// useFormatDate()) so detail.tsx's rendered output is byte-for-byte
// unchanged, while the worker passes a simple org-date-format-based
// formatter (see resolveDateFnsPattern below) since it has no per-viewer
// timezone to honour.
import { format } from "date-fns";
import type { LedgerEntry } from "./types";

export type StatementLedgerInvoice = {
  invoice_number: string | null;
  status: string;
  issue_date: string | null;
  total: number | null;
  paid_at: string | null;
  // Optional on purpose: statements are immutable JSONB snapshots, so rows
  // written before payment tracking existed genuinely have no amount_paid.
  // Callers must fall back (see statementPaidAmount) rather than assume 0,
  // which would make every historical statement look unpaid.
  amount_paid?: number | null;
};

// Money received against a snapshotted invoice, tolerant of pre-ledger rows.
// Old snapshots recorded paid-ness only via status/paid_at and always implied
// the full total, which is exactly what the fallback reproduces. Mirrors
// apps/app/src/lib/queries/statements.ts's statementPaidAmount — kept as a
// private duplicate here rather than imported, since that module is
// app-only (imports the Supabase client) and this package must stay
// framework-agnostic.
function statementPaidAmount(inv: StatementLedgerInvoice): number {
  if (typeof inv.amount_paid === "number") return inv.amount_paid;
  return inv.status === "paid" ? (inv.total ?? 0) : 0;
}

// A single real payment record, dated at when it was actually received —
// used instead of the per-invoice amount_paid fallback once a statement has
// a payments_snapshot (see BuildStatementLedgerOpts.payments below).
// Snake_case to match StatementLedgerInvoice and the JSONB shape stored on
// statements.payments_snapshot, so callers can pass the column straight
// through with no field renaming.
export type StatementLedgerPayment = {
  invoice_id: string | null;
  invoice_number: string | null;
  amount: number;
  paid_at: string;
  currency?: string | null;
};

type LedgerEvent = {
  date: string;
  description: string;
  invoiceNumber: string | null;
  debit: number;
  credit: number;
};

export interface BuildStatementLedgerOpts {
  /** The statement's closing date (statement.date_to) — used to date an
   * unsettled partial payment's credit line, matching detail.tsx's original
   * behaviour of "Payments received to date" with no per-payment date. Only
   * consulted on the legacy path (see `payments` below). */
  dateTo: string;
  /** Applied to every raw date (ISO date or timestamp) before it lands on
   * the returned entry. */
  formatDate: (value: string) => string;
  /** Balance carried in from before the statement period (statements.
   * opening_balance). Only meaningful when `payments` is also provided —
   * the legacy path (no `payments`) always starts at 0, matching every
   * statement generated before opening balances existed. */
  openingBalance?: number;
  /** Real payment records for the statement's customer, dated at their
   * actual paid_at (statements.payments_snapshot). When provided (even as an
   * empty array), the ledger is built from real payment dates and
   * `openingBalance` instead of the legacy per-invoice amount_paid fallback:
   * debits come from `snapshot`, credits come from `payments`. Omit (or pass
   * null/undefined) for a legacy statement with no payments_snapshot — the
   * ledger then behaves exactly as it did before this option existed. */
  payments?: StatementLedgerPayment[] | null;
}

export function buildStatementLedger(
  snapshot: StatementLedgerInvoice[],
  opts: BuildStatementLedgerOpts,
): LedgerEntry[] {
  return opts.payments != null
    ? buildFromPayments(snapshot, opts.payments, opts)
    : buildFromAmountPaid(snapshot, opts);
}

// ─── New path: real payment dates + a carried-in opening balance ──────────

function buildFromPayments(
  snapshot: StatementLedgerInvoice[],
  payments: StatementLedgerPayment[],
  opts: BuildStatementLedgerOpts,
): LedgerEntry[] {
  const events: LedgerEvent[] = [];

  for (const inv of snapshot) {
    if (!inv.total) continue;
    events.push({
      date: inv.issue_date ?? "",
      description: "Invoice issued",
      invoiceNumber: inv.invoice_number ?? null,
      debit: inv.total,
      credit: 0,
    });
  }

  for (const p of payments) {
    if (!p.amount) continue;
    events.push({
      date: p.paid_at,
      description: "Payment received",
      invoiceNumber: p.invoice_number ?? null,
      debit: 0,
      credit: p.amount,
    });
  }

  events.sort((a, b) => a.date.localeCompare(b.date));

  const entries: LedgerEntry[] = [];
  let balance = opts.openingBalance ?? 0;

  for (const ev of events) {
    balance += ev.debit - ev.credit;
    entries.push({ ...ev, date: opts.formatDate(ev.date), balance });
  }

  return entries;
}

// ─── Legacy path: per-invoice amount_paid fallback, unchanged ─────────────

function buildFromAmountPaid(
  snapshot: StatementLedgerInvoice[],
  opts: BuildStatementLedgerOpts,
): LedgerEntry[] {
  const events: LedgerEvent[] = [];

  for (const inv of snapshot) {
    if (!inv.total) continue;
    events.push({
      date: inv.issue_date ?? "",
      description: "Invoice issued",
      invoiceNumber: inv.invoice_number ?? null,
      debit: inv.total,
      credit: 0,
    });
    // Credit what was actually received, not the invoice total — otherwise a
    // part-paid invoice contributes a full debit and no credit, and the
    // customer is shown the whole amount as still outstanding.
    const paid = statementPaidAmount(inv);
    if (paid > 0) {
      // A partially paid invoice has no paid_at (the sync trigger only sets
      // it on full payment) and the snapshot holds no per-payment dates, so
      // date the credit at the statement's closing date rather than invent
      // one.
      const settled = inv.paid_at && paid >= inv.total;
      events.push({
        date: settled ? inv.paid_at! : opts.dateTo,
        description: settled ? "Payment received" : "Payments received to date",
        invoiceNumber: inv.invoice_number ?? null,
        debit: 0,
        credit: paid,
      });
    }
  }

  events.sort((a, b) => a.date.localeCompare(b.date));

  const entries: LedgerEntry[] = [];
  let balance = 0;

  for (const ev of events) {
    balance += ev.debit - ev.credit;
    entries.push({ ...ev, date: opts.formatDate(ev.date), balance });
  }

  return entries;
}

// ─── Simple, timezone-agnostic date formatting for server contexts ────────
// Used by apps/worker (no per-viewer profile/timezone), mirroring the legacy
// format-string remap in apps/app/src/lib/format-date.ts's
// makeDateFormatters without pulling in @date-fns/tz — a server render has
// no "current viewer" to localize for.

const LEGACY_FORMAT_MAP: Record<string, string> = {
  "DD/MM/YYYY": "dd/MM/yyyy",
  "MM/DD/YYYY": "MM/dd/yyyy",
  "YYYY-MM-DD": "yyyy-MM-dd",
  "D MMM YYYY": "d MMM yyyy",
};

/** Maps an org's stored date_format setting (e.g. "DD/MM/YYYY") to the
 * date-fns pattern used to format it. Falls back to "dd/MM/yyyy" — the same
 * default apps/app uses. */
export function resolveDateFnsPattern(dateFormat: string | null | undefined): string {
  const fmt = dateFormat ?? "DD/MM/YYYY";
  return LEGACY_FORMAT_MAP[fmt] ?? fmt ?? "dd/MM/yyyy";
}

/** Formats a date-only ("YYYY-MM-DD") or full ISO timestamp string with the
 * given date-fns pattern, with no timezone conversion (server contexts have
 * no viewer timezone to convert to). Date-only strings are parsed from their
 * literal parts so the calendar date never shifts. Returns the raw value
 * unchanged if it fails to parse — never throws. */
export function formatServerDate(value: string | null | undefined, pattern: string): string {
  if (!value) return "—";
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split("-").map(Number);
      return format(new Date(year, month - 1, day), pattern);
    }
    return format(new Date(value), pattern);
  } catch {
    return value;
  }
}
