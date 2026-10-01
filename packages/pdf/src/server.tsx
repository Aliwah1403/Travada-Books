// Node-only entry point. Never import this from browser code — apps/app
// downloads PDFs client-side via @react-pdf/renderer's `pdf(...).toBlob()`
// (see apps/app/src/lib/pdf-download.ts) and should keep importing templates
// from "@travada-books/pdf" instead. This module is for apps/worker
// (Trigger.dev tasks, run under Node) and for the Phase 1 smoke script.
import * as React from "react";
import { renderToBuffer } from "@react-pdf/renderer";

// Some Node/TS-in-Node toolchains (confirmed: `tsx`'s CommonJS require hook,
// used by apps/worker/scripts/render-pdf-smoke.ts) transpile this package's
// JSX with the classic "React.createElement" runtime instead of the
// automatic runtime our tsconfig ("jsx": "react-jsx") requests — even with
// an explicit tsconfig passed in. Vite (apps/app) and this package's own
// `tsc` both honour the automatic runtime correctly, so this is a
// Node-execution-only gap. Polyfilling the global here — before any JSX in
// this package's dependency graph is evaluated — makes rendering resilient
// to whichever transform a given Node toolchain actually applies, without
// touching the browser-safe templates/components (which stay import-free,
// matching the working Vite build). Harmless no-op when automatic runtime is
// correctly used. See the Phase 1 report for what this covers and doesn't.
if (typeof (globalThis as { React?: unknown }).React === "undefined") {
  (globalThis as { React?: unknown }).React = React;
}
import { parseCustomFields } from "./custom-fields";
import { buildInvoiceDocumentData, type InvoiceDocumentDataRow } from "./mappers/invoice";
import { buildQuoteDocumentData, type QuoteDocumentDataRow } from "./mappers/quote";
import { buildStatementDocumentData } from "./mappers/statement";
import { InvoicePdf } from "./templates/invoice-pdf";
import { StatementPdf } from "./templates/statement-pdf";
import type { LedgerEntry, Participant } from "./types";

// Fetches a logo URL and returns it as a base64 data URL for embedding in a
// server-rendered PDF (react-pdf's Image component can also fetch a bare URL
// itself, but resolving it up front avoids per-render network calls and
// matches the data-URL approach apps/app uses today via urlToDataUrl).
// Mirrors the "failures never block PDF generation" behaviour used
// throughout the app (`.catch(() => null)` around urlToDataUrl calls).
//
// Returns null on ANY failure to resolve a safe, embeddable image — including
// a successful fetch of a WebP image, which @react-pdf/renderer cannot
// decode. Callers must treat null as "render without a logo" and must never
// fall back to the raw `url` (see resolveParticipantLogo below) — react-pdf
// would otherwise attempt to fetch/decode that URL itself at render time,
// reintroducing the exact failure this function exists to avoid.
export async function resolveLogoDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/png";
    if (contentType.toLowerCase().includes("image/webp")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

// A resolver with the same shape as resolveLogoDataUrl above — callers that
// render many documents in one batch (e.g. the worker's org data export) can
// pass a memoizing wrapper so a given logo URL is only fetched/decoded once
// for the whole batch instead of once per document.
export type LogoResolver = (url: string) => Promise<string | null>;

// Resolves a participant's logo for server rendering, always overwriting
// `logo_url` with either a safe data URL or null — never the original
// (possibly unreachable or WebP) URL. See resolveLogoDataUrl's comment.
async function resolveParticipantLogo(
  participant: Participant,
  resolveLogo: LogoResolver = resolveLogoDataUrl,
): Promise<Participant> {
  const logoDataUrl = participant.logo_url ? await resolveLogo(participant.logo_url) : null;
  return { ...participant, logo_url: logoDataUrl };
}

type Snapshot = Record<string, unknown> | null | undefined;

function participantFromSnapshot(snapshot: Snapshot, fallbackName?: string | null): Participant {
  const s = (snapshot ?? {}) as Record<string, unknown>;
  const str = (key: string): string | null | undefined => {
    const v = s[key];
    return typeof v === "string" ? v : v === null ? null : undefined;
  };
  return {
    name: str("name") ?? fallbackName ?? null,
    logo_url: str("logo_url"),
    address_line1: str("address_line1"),
    address_line2: str("address_line2"),
    city: str("city"),
    zip: str("zip"),
    country: str("country"),
    country_code: str("country_code"),
    phone: str("phone"),
    email: str("email"),
    billing_email: str("billing_email"),
    tax_id: str("tax_id"),
  };
}

export interface InvoicePdfRow extends InvoiceDocumentDataRow {
  from_details: Snapshot;
  customer_details: Snapshot;
  customer_name?: string | null;
  custom_fields?: unknown;
}

export interface RenderInvoicePdfOpts {
  publicUrl?: string | null;
  resolveLogo?: LogoResolver;
}

export async function renderInvoicePdf(
  row: InvoicePdfRow,
  opts: RenderInvoicePdfOpts = {},
): Promise<Buffer> {
  const from = await resolveParticipantLogo(participantFromSnapshot(row.from_details), opts.resolveLogo);
  const customer = participantFromSnapshot(row.customer_details, row.customer_name);

  const data = buildInvoiceDocumentData(row, {
    from,
    customer,
    customFields: parseCustomFields(row.custom_fields),
    publicUrl: opts.publicUrl ?? null,
  });

  return renderToBuffer(<InvoicePdf data={data} />);
}

export interface QuotePdfRow extends QuoteDocumentDataRow {
  from_details: Snapshot;
  customer_details: Snapshot;
  customer_name?: string | null;
  custom_fields?: unknown;
}

export interface RenderQuotePdfOpts {
  publicUrl?: string | null;
  resolveLogo?: LogoResolver;
}

export async function renderQuotePdf(
  row: QuotePdfRow,
  opts: RenderQuotePdfOpts = {},
): Promise<Buffer> {
  const from = await resolveParticipantLogo(participantFromSnapshot(row.from_details), opts.resolveLogo);
  const customer = participantFromSnapshot(row.customer_details, row.customer_name);

  const data = buildQuoteDocumentData(row, {
    from,
    customer,
    customFields: parseCustomFields(row.custom_fields),
    publicUrl: opts.publicUrl ?? null,
  });

  return renderToBuffer(<InvoicePdf data={data} />);
}

export interface StatementPdfRow {
  from_details: Snapshot;
  customer_details: Snapshot;
  currency: string;
  statementDate: string;
  dateFrom: string;
  dateTo: string;
  entries: LedgerEntry[];
  notes: string | null;
  openingBalance: number;
}

export interface RenderStatementPdfOpts {
  publicUrl?: string | null;
  resolveLogo?: LogoResolver;
}

export async function renderStatementPdf(
  row: StatementPdfRow,
  opts: RenderStatementPdfOpts = {},
): Promise<Buffer> {
  const from = await resolveParticipantLogo(participantFromSnapshot(row.from_details), opts.resolveLogo);
  const customer = participantFromSnapshot(row.customer_details);

  const data = buildStatementDocumentData({
    currency: row.currency,
    from,
    customer,
    statementDate: row.statementDate,
    dateFrom: row.dateFrom,
    dateTo: row.dateTo,
    entries: row.entries,
    notes: row.notes,
    publicUrl: opts.publicUrl ?? null,
    openingBalance: row.openingBalance,
  });

  return renderToBuffer(<StatementPdf data={data} />);
}
