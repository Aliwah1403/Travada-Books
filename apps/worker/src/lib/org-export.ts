import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@trigger.dev/sdk";
import Papa from "papaparse";
import JSZip from "jszip";
import { format as formatDate } from "date-fns";
import {
  createLogoCache,
  renderInvoiceBuffer,
  renderQuoteBuffer,
  renderStatementBuffer,
  type InvoiceForPdf,
  type QuoteForPdf,
  type StatementForPdf,
} from "./document-pdf";
import {
  COLUMN_HEADERS as TX_COLUMN_HEADERS,
  TRANSACTION_EXPORT_SELECT,
  buildRow as buildTxRow,
  sanitizeFolderName,
  type TransactionExportRow,
} from "./transaction-export-format";

// Human-readable ZIP layout (mirrors Midday's export-team-data.ts, see
// ORG-EXPORT-PLAN.md): a readable root layer (transactions.csv, invoices.csv,
// quotes.csv, statements.csv, customers.csv, payments.csv,
// recurring-invoices.csv, documents.csv, inbox.csv, tags.json) plus the
// per-document files (invoices/, quotes/, statements/, attachments/,
// inbox/, documents/, other-files/, logo.<ext>) — every storage object
// appears exactly once, precedence top-to-bottom. No raw table dump and no
// README — like Midday, the layout is the documentation.

// ── Config ──────────────────────────────────────────────────────────────────

// Keep a running byte total per ZIP part; once adding a file would push it
// past this, finalise the part and start a new one. Uploaded immediately so
// we can drop the in-memory buffer before starting the next part.
const MAX_PART_BYTES = 400 * 1024 * 1024; // 400 MB

// Per-org tables loaded to build the readable CSVs and file sections below —
// never written out raw. document_tag_assignments is fetched separately (it
// has no org_id column to page by).
const EXPORT_TABLES = [
  "customers",
  "invoices",
  "invoice_payments",
  "invoice_recurring",
  "quotes",
  "statements",
  "transactions",
  "transaction_attachments",
  "documents",
  "vault_folders",
  "document_tags",
  "inbox_items",
] as const;

// Storage buckets that hold org-scoped files, keyed by the path prefix under
// which this org's files live. `vault/{orgId}/exports/` is skipped — that's
// where past exports of this very kind live, no point re-bundling them.
type StorageSource = { bucket: string; prefix: string; skipPrefixes?: string[] };

// ── Public types ────────────────────────────────────────────────────────────

export type MemberExportRow = {
  Name: string;
  Email: string;
  Role: string;
  Status: string;
  Joined: string;
};

export type BuildOrgExportParams = {
  orgId: string;
  exportId: string;
  /**
   * Pre-built members.csv rows. Pass this when the org's `organization_members`
   * rows have already been removed by the time this runs (export-on-delete —
   * the caller snapshots membership before deleting it) so members.csv doesn't
   * come back empty. When omitted, members are queried live from the DB.
   */
  members?: MemberExportRow[];
};

export type BuildOrgExportResult = {
  /** Storage paths (in the org-exports bucket) of every ZIP part produced. */
  filePaths: string[];
  /** Total database rows written across all exported tables + members. */
  itemCount: number;
  /** Storage paths that could not be downloaded and were skipped, with why. */
  skippedFiles: { path: string; reason: string }[];
  /** Invoice/quote/statement PDFs that could not be rendered, with why. */
  failedRenders: { kind: string; label: string; reason: string }[];
  /** How the invoice/quote/statement PDFs in this export were produced. */
  pdfStats: { stored: number; rendered: number; renderMs: number };
};

// ── Small helpers ───────────────────────────────────────────────────────────

function sanitizeSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "organisation"
  );
}

// Prefix with a single quote if the value could be interpreted as a
// spreadsheet formula when the CSV is opened in Excel/Sheets.
function escapeCell(value: string | number | null | undefined): string | number {
  if (typeof value !== "string") return value ?? "";
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function flattenRow(row: Record<string, unknown>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === null || value === undefined) {
      out[key] = "";
    } else if (typeof value === "object") {
      out[key] = escapeCell(JSON.stringify(value));
    } else if (typeof value === "number") {
      out[key] = value;
    } else if (typeof value === "boolean") {
      out[key] = String(value);
    } else {
      out[key] = escapeCell(String(value));
    }
  }
  return out;
}

function rowsToCsv(rows: Record<string, unknown>[], emptyNote: string): string {
  if (rows.length === 0) return emptyNote;
  return Papa.unparse(rows.map(flattenRow));
}

// Given a full storage path and an orgId known to be one of its path
// segments, return everything after the orgId segment (used to build the
// path inside the ZIP, independent of which bucket/prefix shape it came from).
function pathAfterOrgId(fullPath: string, orgId: string): string {
  const idx = fullPath.indexOf(orgId);
  if (idx === -1) return fullPath;
  const rest = fullPath.slice(idx + orgId.length + 1);
  return rest || fullPath;
}

// Human-readable file/folder name for the ZIP — strips characters that don't
// belong in a path on any OS but keeps spaces, so names like
// "INV-011 - Acme Business LTD.pdf" stay legible (unlike
// transaction-export-format.ts's sanitizeFolderName, which is capped at 50
// chars for the narrower "date + transaction name" folder case).
function sanitizeZipName(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, "-").replace(/\s+/g, " ").trim().slice(0, 150) || "untitled";
}

// Resolves a collision on an exact ZIP path by appending " (2)", " (3)", …
// before the extension. Every section that places a file into the ZIP runs
// its path through this against a shared Set, so "each storage object
// appears once, and no two objects collide on the same name" holds globally.
function uniqueZipPath(used: Set<string>, path: string): string {
  if (!used.has(path)) {
    used.add(path);
    return path;
  }
  const slashIdx = path.lastIndexOf("/");
  const dotIdx = path.lastIndexOf(".");
  const hasExt = dotIdx > slashIdx;
  const base = hasExt ? path.slice(0, dotIdx) : path;
  const ext = hasExt ? path.slice(dotIdx) : "";
  let n = 2;
  let candidate = `${base} (${n})${ext}`;
  while (used.has(candidate)) {
    n += 1;
    candidate = `${base} (${n})${ext}`;
  }
  used.add(candidate);
  return candidate;
}

async function downloadFile(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
): Promise<Buffer | null> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

// Storage `.list()` is one level deep and paginated; folders come back with
// `id === null`. Recurse into folders, skip anything under a skipPrefix.
// Exported so the export-on-delete task can reuse it to purge storage
// without duplicating the recursion logic.
export async function listStorageFilesRecursive(
  supabase: SupabaseClient,
  bucket: string,
  prefix: string,
  skipPrefixes: string[] = [],
): Promise<string[]> {
  const results: string[] = [];
  const limit = 1000;
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`Failed to list ${bucket}/${prefix}: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const entry of data) {
      const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (skipPrefixes.some((p) => fullPath === p || fullPath.startsWith(`${p}/`))) continue;

      if (entry.id === null) {
        // Folder placeholder — recurse.
        const nested = await listStorageFilesRecursive(supabase, bucket, fullPath, skipPrefixes);
        results.push(...nested);
      } else {
        results.push(fullPath);
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return results;
}

async function pageTable(
  supabase: SupabaseClient,
  table: string,
  orgId: string,
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  const pageSize = 1000;
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("org_id", orgId)
      .order("id")
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`Failed to page ${table}: ${error.message}`);
    if (!data || data.length === 0) break;

    rows.push(...(data as Record<string, unknown>[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

// `document_tag_assignments` (document_id, tag_id) has no org_id column, so
// it can't be paged the same way as the other tables — that's exactly why
// today's export drops it (the gap this fixes). Chunk the org's own document
// ids into `.in()` batches instead.
async function fetchDocumentTagAssignments(
  supabase: SupabaseClient,
  documentIds: string[],
): Promise<{ document_id: string; tag_id: string }[]> {
  const rows: { document_id: string; tag_id: string }[] = [];
  const chunkSize = 200;

  for (let i = 0; i < documentIds.length; i += chunkSize) {
    const chunk = documentIds.slice(i, i + chunkSize);
    if (chunk.length === 0) continue;

    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("document_tag_assignments")
        .select("document_id, tag_id")
        .in("document_id", chunk)
        .range(from, from + 999);
      if (error) throw new Error(`Failed to page document_tag_assignments: ${error.message}`);
      if (!data || data.length === 0) break;

      rows.push(...(data as { document_id: string; tag_id: string }[]));
      if (data.length < 1000) break;
      from += 1000;
    }
  }

  return rows;
}

// Curated transactions.csv (root) — same readable format as
// export-transactions.ts, paged across the whole org instead of a chosen id
// list. Secondary sort on id keeps `.range()` pagination stable when many
// rows share a date.
async function pageTransactionsForExport(
  supabase: SupabaseClient,
  orgId: string,
): Promise<TransactionExportRow[]> {
  const rows: TransactionExportRow[] = [];
  const pageSize = 1000;
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("transactions")
      .select(TRANSACTION_EXPORT_SELECT)
      .eq("org_id", orgId)
      .order("date", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`Failed to page transactions for export: ${error.message}`);
    if (!data || data.length === 0) break;

    rows.push(...(data as unknown as TransactionExportRow[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

// vault_folders.parent_id chain → "Contracts/Employees"-style path, each
// segment sanitized for the ZIP. Folders are few per org, so resolving with
// a memoizing DFS is simplest.
function buildFolderPaths(folders: Record<string, unknown>[]): Map<string, string> {
  const byId = new Map<string, { name: string; parentId: string | null }>();
  for (const f of folders) {
    byId.set(f.id as string, {
      name: (f.name as string) ?? "folder",
      parentId: (f.parent_id as string | null) ?? null,
    });
  }

  const resolved = new Map<string, string>();
  function resolve(id: string, seen: Set<string>): string {
    const cached = resolved.get(id);
    if (cached !== undefined) return cached;
    if (seen.has(id)) return ""; // cycle guard — should never happen
    seen.add(id);

    const folder = byId.get(id);
    if (!folder) return "";
    const name = sanitizeZipName(folder.name);
    const path = folder.parentId ? `${resolve(folder.parentId, seen)}/${name}` : name;
    resolved.set(id, path);
    return path;
  }

  const result = new Map<string, string>();
  for (const id of byId.keys()) result.set(id, resolve(id, new Set()));
  return result;
}

function customerNameForRow(
  row: { customer_details?: unknown; customer_name?: string | null; customer_id?: string | null },
  customersById: Map<string, Record<string, unknown>>,
): string {
  const snapshotName = (row.customer_details as { name?: string } | null)?.name;
  if (snapshotName) return snapshotName;
  if (row.customer_name) return row.customer_name;
  const customer = row.customer_id ? customersById.get(row.customer_id) : undefined;
  return (customer?.name as string | undefined) ?? "";
}

// ── ZIP part writer ─────────────────────────────────────────────────────────
// Every part is numbered (…-part-1.zip, …-part-2.zip, …) even when there
// ends up being only one — parts are uploaded eagerly as they fill, so the
// final part count isn't known while part 1 is still being written, and
// there's nowhere to retroactively rename an already-uploaded object.

class ZipPartWriter {
  private zip = new JSZip();
  private bytes = 0;
  private entries = 0;
  private partIndex = 1;
  private readonly uploadedPaths: string[] = [];

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly exportId: string,
    private readonly baseName: string,
  ) {}

  async add(path: string, buffer: Buffer): Promise<void> {
    if (this.entries > 0 && this.bytes + buffer.length > MAX_PART_BYTES) {
      await this.flush();
    }
    this.zip.file(path, buffer);
    this.bytes += buffer.length;
    this.entries += 1;
  }

  private async flush(): Promise<void> {
    if (this.entries === 0) return;

    const buffer = await this.zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    const uploadPath = `${this.exportId}/${this.baseName}-part-${this.partIndex}.zip`;
    logger.info("Uploading org export part", { uploadPath, bytes: buffer.length });

    const { error } = await this.supabase.storage
      .from("org-exports")
      .upload(uploadPath, buffer, { contentType: "application/zip", upsert: true });
    if (error) throw new Error(`Failed to upload export part ${this.partIndex}: ${error.message}`);

    this.uploadedPaths.push(uploadPath);
    this.partIndex += 1;

    // Drop references so the old buffers can be GC'd before the next part.
    this.zip = new JSZip();
    this.bytes = 0;
    this.entries = 0;
  }

  async finish(): Promise<string[]> {
    await this.flush();
    return this.uploadedPaths;
  }
}

// ── Members CSV ─────────────────────────────────────────────────────────────

type MemberJoinRow = {
  role: string;
  status: string;
  email: string | null;
  created_at: string;
  users: { full_name: string | null; email: string | null } | null;
};

async function buildMembersCsv(
  supabase: SupabaseClient,
  orgId: string,
  overrideMembers?: MemberExportRow[],
): Promise<{ csv: string; count: number }> {
  if (overrideMembers) {
    return {
      csv: overrideMembers.length === 0 ? "No members found." : Papa.unparse(overrideMembers),
      count: overrideMembers.length,
    };
  }

  const { data, error } = await supabase
    .from("organization_members")
    .select("role, status, email, created_at, users(full_name, email)")
    .eq("org_id", orgId)
    .order("created_at");

  if (error) throw new Error(`Failed to fetch members: ${error.message}`);

  const rows = (data ?? []) as unknown as MemberJoinRow[];
  const flattened = rows.map((m) => ({
    Name: m.users?.full_name ?? "",
    Email: m.users?.email ?? m.email ?? "",
    Role: m.role,
    Status: m.status,
    Joined: m.created_at,
  }));

  return {
    csv: rows.length === 0 ? "No members found." : Papa.unparse(flattened),
    count: rows.length,
  };
}

// ── Main entry point ────────────────────────────────────────────────────────

export async function buildOrgExport(
  supabase: SupabaseClient,
  { orgId, exportId, members: membersOverride }: BuildOrgExportParams,
): Promise<BuildOrgExportResult> {
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();
  if (orgError || !org) throw new Error(`Failed to fetch organization: ${orgError?.message ?? "not found"}`);

  const orgName = (org as { name?: string }).name ?? "organisation";
  const slug = sanitizeSlug(orgName);
  const exportDate = formatDate(new Date(), "yyyy-MM-dd");
  const baseName = `travada-export-${slug}-${exportDate}`;

  const writer = new ZipPartWriter(supabase, exportId, baseName);
  let itemCount = 0;

  // Storage paths (as `${bucket}:${path}`) already placed somewhere in the
  // ZIP — enforces "every storage object appears once" across every section
  // below, in the precedence order they run.
  const includedPaths = new Set<string>();
  // ZIP entry paths already used — resolves name collisions everywhere.
  const usedZipPaths = new Set<string>();
  // Maps a storage path back to where it landed in the ZIP, so documents.csv
  // can point at the actual file even when it was placed by an earlier
  // section (an invoice PDF, a transaction attachment, an inbox file).
  const storagePathToZipPath = new Map<string, string>();

  const skippedFiles: { path: string; reason: string }[] = [];
  const failedRenders: { kind: string; label: string; reason: string }[] = [];
  const pdfStats = { stored: 0, rendered: 0, renderMs: 0 };

  // ── organization.json ──────────────────────────────────────────────────
  await writer.add("organization.json", Buffer.from(JSON.stringify(org, null, 2), "utf-8"));

  // ── members.csv ────────────────────────────────────────────────────────
  logger.info("Exporting members", { exportId, orgId });
  const members = await buildMembersCsv(supabase, orgId, membersOverride);
  await writer.add("members.csv", Buffer.from(members.csv, "utf-8"));
  itemCount += members.count;

  // ── Load the org's tables (source for every CSV below) ──────────────────
  const tableRows: Record<string, Record<string, unknown>[]> = {};
  for (const table of EXPORT_TABLES) {
    logger.info("Loading table", { exportId, table });
    const rows = await pageTable(supabase, table, orgId);
    tableRows[table] = rows;
    itemCount += rows.length;
  }

  // Gap fix: document_tag_assignments has no org_id, so it can't page like
  // the tables above — fetch it via the org's own document ids instead.
  const documentIds = tableRows.documents.map((d) => d.id as string);
  const tagAssignments = await fetchDocumentTagAssignments(supabase, documentIds);
  itemCount += tagAssignments.length;

  await writer.add(
    "tags.json",
    Buffer.from(
      JSON.stringify({ documentTags: tableRows.document_tags, documentTagAssignments: tagAssignments }, null, 2),
      "utf-8",
    ),
  );

  // ── Lookup maps used by everything below ────────────────────────────────
  const customersById = new Map(tableRows.customers.map((c) => [c.id as string, c]));
  const invoicesById = new Map(tableRows.invoices.map((i) => [i.id as string, i]));
  const txById = new Map(tableRows.transactions.map((t) => [t.id as string, t]));
  const folderPathById = buildFolderPaths(tableRows.vault_folders);
  const tagNameById = new Map(tableRows.document_tags.map((t) => [t.id as string, t.name as string]));
  const tagNamesByDocId = new Map<string, string[]>();
  for (const a of tagAssignments) {
    const list = tagNamesByDocId.get(a.document_id) ?? [];
    const name = tagNameById.get(a.tag_id);
    if (name) list.push(name);
    tagNamesByDocId.set(a.document_id, list);
  }

  // ── 1. Invoice / quote / statement PDFs ─────────────────────────────────
  // A shared logo cache so the whole export fetches/decodes a given org
  // logo at most once, no matter how many documents get rendered.
  const logoCache = createLogoCache();

  async function placeDocumentPdf(params: {
    kind: "invoice" | "quote" | "statement";
    folder: string;
    zipNameBase: string; // without extension
    label: string;
    filePath: string | null | undefined;
    render: () => Promise<Buffer>;
  }): Promise<string | null> {
    const zipPath = uniqueZipPath(usedZipPaths, `${params.folder}/${sanitizeZipName(params.zipNameBase)}.pdf`);

    let buffer: Buffer | null = null;
    let usedStored = false;

    if (params.filePath) {
      buffer = await downloadFile(supabase, "vault", params.filePath);
      if (buffer) usedStored = true;
    }

    if (!buffer) {
      const startedAt = Date.now();
      try {
        buffer = await params.render();
        pdfStats.rendered += 1;
        pdfStats.renderMs += Date.now() - startedAt;
      } catch (err) {
        logger.warn(`Failed to render ${params.kind} PDF, skipping`, { label: params.label, error: String(err) });
        failedRenders.push({ kind: params.kind, label: params.label, reason: String(err) });
        return null;
      }
    } else {
      pdfStats.stored += 1;
    }

    await writer.add(zipPath, buffer);

    if (usedStored && params.filePath) {
      const key = `vault:${params.filePath}`;
      includedPaths.add(key);
      storagePathToZipPath.set(key, zipPath);
    }

    return zipPath;
  }

  const invoicePdfPathById = new Map<string, string>();
  for (const raw of tableRows.invoices) {
    const invoice = raw as unknown as InvoiceForPdf & {
      status?: string;
      file_path?: string | null;
      customer_id?: string | null;
    };
    // Drafts have null snapshots and are never rendered — only documents
    // that have actually been sent get a PDF.
    if (!invoice.from_details || !invoice.customer_details) continue;

    const customerName = customerNameForRow(invoice, customersById) || "Customer";
    const label = invoice.invoice_number ?? invoice.id;
    const zipPath = await placeDocumentPdf({
      kind: "invoice",
      folder: "invoices",
      zipNameBase: `${label} - ${customerName}`,
      label,
      filePath: invoice.file_path,
      render: () => renderInvoiceBuffer(invoice, { resolveLogo: logoCache }),
    });
    if (zipPath) invoicePdfPathById.set(invoice.id, zipPath);
  }

  const quotePdfPathById = new Map<string, string>();
  for (const raw of tableRows.quotes) {
    const quote = raw as unknown as QuoteForPdf & {
      status?: string;
      file_path?: string | null;
      customer_id?: string | null;
    };
    if (!quote.from_details || !quote.customer_details) continue;

    const customerName = customerNameForRow(quote, customersById) || "Customer";
    const label = quote.quote_number ?? quote.id;
    const zipPath = await placeDocumentPdf({
      kind: "quote",
      folder: "quotes",
      zipNameBase: `${label} - ${customerName}`,
      label,
      filePath: quote.file_path,
      render: () => renderQuoteBuffer(quote, { resolveLogo: logoCache }),
    });
    if (zipPath) quotePdfPathById.set(quote.id, zipPath);
  }

  const statementPdfPathById = new Map<string, string>();
  for (const raw of tableRows.statements) {
    const statement = raw as unknown as StatementForPdf & {
      file_path?: string | null;
      customer_id?: string | null;
    };
    // Statements always carry their from_details/customer_details snapshot
    // from the moment they're created — no draft concept to filter on.
    const customerName = customerNameForRow(statement, customersById) || "Customer";
    const label = `${statement.date_from} – ${statement.date_to}`;
    const zipPath = await placeDocumentPdf({
      kind: "statement",
      folder: "statements",
      zipNameBase: `${customerName} ${statement.date_from}_${statement.date_to}`,
      label,
      filePath: statement.file_path,
      render: () => renderStatementBuffer(supabase, statement, { resolveLogo: logoCache }),
    });
    if (zipPath) statementPdfPathById.set(statement.id, zipPath);
  }

  // ── 2. Transaction attachments ──────────────────────────────────────────
  for (const raw of tableRows.transaction_attachments) {
    const att = raw as { id: string; transaction_id: string; file_path: string; file_name: string };
    const key = `vault:${att.file_path}`;
    if (includedPaths.has(key)) continue;

    const buffer = await downloadFile(supabase, "vault", att.file_path);
    if (!buffer) {
      skippedFiles.push({ path: `vault/${att.file_path}`, reason: "download failed" });
      continue;
    }

    const tx = txById.get(att.transaction_id);
    const type = (tx?.type as string | undefined) === "income" ? "income" : "expense";
    const folderName = sanitizeFolderName(`${(tx?.date as string | undefined) ?? "unknown"} ${(tx?.name as string | undefined) ?? "transaction"}`);
    const zipPath = uniqueZipPath(
      usedZipPaths,
      `attachments/${type}/${folderName}/${sanitizeZipName(att.file_name)}`,
    );

    await writer.add(zipPath, buffer);
    includedPaths.add(key);
    storagePathToZipPath.set(key, zipPath);
  }

  // ── 3. Inbox files ───────────────────────────────────────────────────────
  const inboxZipPathById = new Map<string, string>();
  for (const raw of tableRows.inbox_items) {
    const item = raw as { id: string; file_path: string; file_name: string };
    if (!item.file_path) continue;
    const key = `vault:${item.file_path}`;
    if (includedPaths.has(key)) {
      const existing = storagePathToZipPath.get(key);
      if (existing) inboxZipPathById.set(item.id, existing);
      continue;
    }

    const buffer = await downloadFile(supabase, "vault", item.file_path);
    if (!buffer) {
      skippedFiles.push({ path: `vault/${item.file_path}`, reason: "download failed" });
      continue;
    }

    const safeName = sanitizeZipName(item.file_name ?? "file");
    let zipPath = `inbox/${safeName}`;
    if (usedZipPaths.has(zipPath)) zipPath = `inbox/${item.id}_${safeName}`;
    zipPath = uniqueZipPath(usedZipPaths, zipPath);

    await writer.add(zipPath, buffer);
    includedPaths.add(key);
    storagePathToZipPath.set(key, zipPath);
    inboxZipPathById.set(item.id, zipPath);
  }

  // ── 4. Remaining Vault documents ─────────────────────────────────────────
  const documentZipPathById = new Map<string, string>();
  for (const raw of tableRows.documents) {
    const doc = raw as {
      id: string;
      file_path: string;
      source: string;
      folder_id: string | null;
      name: string;
    };

    const key = `vault:${doc.file_path}`;
    let zipPath = storagePathToZipPath.get(key) ?? "";

    // Invoice/quote/statement-sourced docs are covered by section 1 (even
    // when that section had to render fresh instead of reusing this exact
    // file) — never re-place them here.
    if (!zipPath && doc.source !== "invoice" && doc.source !== "quote" && doc.source !== "statement") {
      const buffer = await downloadFile(supabase, "vault", doc.file_path);
      if (buffer) {
        const folderPath = doc.folder_id ? folderPathById.get(doc.folder_id) ?? "" : "";
        const base = folderPath
          ? `documents/${folderPath}/${sanitizeZipName(doc.name ?? "document")}`
          : `documents/${sanitizeZipName(doc.name ?? "document")}`;
        zipPath = uniqueZipPath(usedZipPaths, base);
        await writer.add(zipPath, buffer);
        includedPaths.add(key);
        storagePathToZipPath.set(key, zipPath);
      } else {
        skippedFiles.push({ path: `vault/${doc.file_path}`, reason: "download failed" });
      }
    }

    documentZipPathById.set(doc.id, zipPath);
  }

  // ── 5. Everything else under the org's storage prefixes ─────────────────
  const catchAllSources: StorageSource[] = [
    { bucket: "vault", prefix: orgId, skipPrefixes: [`${orgId}/exports`] },
    { bucket: "transaction-attachments", prefix: orgId },
    { bucket: "org-assets", prefix: `logos/${orgId}` },
  ];

  for (const source of catchAllSources) {
    logger.info("Listing storage files", { exportId, bucket: source.bucket, prefix: source.prefix });
    const paths = await listStorageFilesRecursive(supabase, source.bucket, source.prefix, source.skipPrefixes);

    for (const path of paths) {
      const key = `${source.bucket}:${path}`;
      if (includedPaths.has(key)) continue;

      const buffer = await downloadFile(supabase, source.bucket, path);
      if (!buffer) {
        skippedFiles.push({ path: `${source.bucket}/${path}`, reason: "download failed" });
        continue;
      }

      let zipPath: string;
      if (source.bucket === "org-assets") {
        const dotIdx = path.lastIndexOf(".");
        const ext = dotIdx > -1 ? path.slice(dotIdx) : "";
        zipPath = uniqueZipPath(usedZipPaths, `logo${ext}`);
      } else {
        zipPath = uniqueZipPath(usedZipPaths, `other-files/${source.bucket}/${pathAfterOrgId(path, orgId)}`);
      }

      await writer.add(zipPath, buffer);
      includedPaths.add(key);
    }
  }

  // ── Readable root CSVs ────────────────────────────────────────────────────

  const curatedTransactions = await pageTransactionsForExport(supabase, orgId);
  const txCsv = Papa.unparse({ fields: TX_COLUMN_HEADERS, data: curatedTransactions.map(buildTxRow) });
  await writer.add("transactions.csv", Buffer.from(txCsv, "utf-8"));

  const invoicesCsvRows = tableRows.invoices.map((raw) => {
    const inv = raw as Record<string, unknown>;
    return {
      Number: (inv.invoice_number as string | null) ?? "",
      Customer: customerNameForRow(inv, customersById),
      "Issue Date": (inv.issue_date as string | null) ?? "",
      "Due Date": (inv.due_date as string | null) ?? "",
      Status: (inv.status as string | null) ?? "",
      Currency: (inv.currency as string | null) ?? "",
      Subtotal: (inv.subtotal as number | null) ?? "",
      Tax: (inv.tax_amount as number | null) ?? "",
      Discount: (inv.discount as number | null) ?? "",
      Total: (inv.total as number | null) ?? "",
      "Amount Paid": (inv.amount_paid as number | null) ?? "",
      "Sent At": (inv.sent_at as string | null) ?? "",
      "Paid At": (inv.paid_at as string | null) ?? "",
      PDF: invoicePdfPathById.get(inv.id as string) ?? "",
    };
  });
  await writer.add(
    "invoices.csv",
    Buffer.from(rowsToCsv(invoicesCsvRows, "No invoices for this organisation."), "utf-8"),
  );

  const quotesCsvRows = tableRows.quotes.map((raw) => {
    const q = raw as Record<string, unknown>;
    return {
      Number: (q.quote_number as string | null) ?? "",
      Customer: customerNameForRow(q, customersById),
      "Issue Date": (q.issue_date as string | null) ?? "",
      "Valid Until": (q.valid_until as string | null) ?? "",
      Status: (q.status as string | null) ?? "",
      Currency: (q.currency as string | null) ?? "",
      Subtotal: (q.subtotal as number | null) ?? "",
      Tax: (q.tax_amount as number | null) ?? "",
      Discount: (q.discount as number | null) ?? "",
      Total: (q.total as number | null) ?? "",
      "Sent At": (q.sent_at as string | null) ?? "",
      "Accepted At": (q.accepted_at as string | null) ?? "",
      PDF: quotePdfPathById.get(q.id as string) ?? "",
    };
  });
  await writer.add("quotes.csv", Buffer.from(rowsToCsv(quotesCsvRows, "No quotes for this organisation."), "utf-8"));

  const statementsCsvRows = tableRows.statements.map((raw) => {
    const s = raw as Record<string, unknown>;
    return {
      Customer: customerNameForRow(s, customersById),
      From: (s.date_from as string | null) ?? "",
      To: (s.date_to as string | null) ?? "",
      Created: (s.created_at as string | null) ?? "",
      PDF: statementPdfPathById.get(s.id as string) ?? "",
    };
  });
  await writer.add(
    "statements.csv",
    Buffer.from(rowsToCsv(statementsCsvRows, "No statements for this organisation."), "utf-8"),
  );

  const customersCsvRows = tableRows.customers.map((raw) => {
    const c = raw as Record<string, unknown>;
    const address = [c.address_line1, c.address_line2, c.city, c.country]
      .filter((v): v is string => typeof v === "string" && v.length > 0)
      .join(", ");
    return {
      Name: (c.name as string | null) ?? "",
      Email: (c.email as string | null) ?? "",
      "Billing Email": (c.billing_email as string | null) ?? "",
      Phone: (c.phone as string | null) ?? "",
      Address: address,
      Country: (c.country as string | null) ?? "",
      "VAT Number": (c.vat_number as string | null) ?? "",
      "Preferred Currency": (c.preferred_currency as string | null) ?? "",
      "Portal Enabled": c.portal_enabled ? "Yes" : "No",
      Archived: c.is_archived ? "Yes" : "No",
    };
  });
  await writer.add(
    "customers.csv",
    Buffer.from(rowsToCsv(customersCsvRows, "No customers for this organisation."), "utf-8"),
  );

  const paymentsCsvRows = tableRows.invoice_payments.map((raw) => {
    const p = raw as Record<string, unknown>;
    const invoice = invoicesById.get(p.invoice_id as string);
    return {
      "Invoice Number": (invoice?.invoice_number as string | undefined) ?? "",
      Customer: invoice ? customerNameForRow(invoice, customersById) : "",
      Amount: (p.amount as number | null) ?? "",
      Currency: (p.currency as string | null) ?? "",
      "Paid At": (p.paid_at as string | null) ?? "",
      Method: (p.method as string | null) ?? "",
      Reference: (p.reference as string | null) ?? "",
      Source: (p.source as string | null) ?? "",
      Note: (p.note as string | null) ?? "",
    };
  });
  await writer.add(
    "payments.csv",
    Buffer.from(rowsToCsv(paymentsCsvRows, "No invoice payments for this organisation."), "utf-8"),
  );

  const recurringCsvRows = tableRows.invoice_recurring.map((raw) => {
    const r = raw as Record<string, unknown>;
    const customer = r.customer_id ? customersById.get(r.customer_id as string) : undefined;
    return {
      Customer: (r.customer_name as string | null) ?? (customer?.name as string | undefined) ?? "",
      Frequency: (r.frequency as string | null) ?? "",
      Status: (r.status as string | null) ?? "",
      Currency: (r.currency as string | null) ?? "",
      Total: (r.total as number | null) ?? "",
      "Next Scheduled": (r.next_scheduled_at as string | null) ?? "",
      "Current Count": (r.current_count as number | null) ?? "",
      "End Type": (r.end_type as string | null) ?? "",
      "End On Date": (r.end_on_date as string | null) ?? "",
      "End After Count": (r.end_after_count as number | null) ?? "",
    };
  });
  await writer.add(
    "recurring-invoices.csv",
    Buffer.from(rowsToCsv(recurringCsvRows, "No recurring invoice series for this organisation."), "utf-8"),
  );

  const documentsCsvRows = tableRows.documents.map((raw) => {
    const doc = raw as Record<string, unknown>;
    const folderPath = doc.folder_id ? folderPathById.get(doc.folder_id as string) ?? "" : "";
    return {
      Name: (doc.name as string | null) ?? "",
      Title: (doc.title as string | null) ?? "",
      Folder: folderPath,
      Source: (doc.source as string | null) ?? "",
      Date: (doc.date as string | null) ?? "",
      Summary: (doc.summary as string | null) ?? "",
      Tags: (tagNamesByDocId.get(doc.id as string) ?? []).join("; "),
      "Zip Path": documentZipPathById.get(doc.id as string) ?? "",
    };
  });
  await writer.add(
    "documents.csv",
    Buffer.from(rowsToCsv(documentsCsvRows, "No Vault documents for this organisation."), "utf-8"),
  );

  const inboxCsvRows = tableRows.inbox_items.map((raw) => {
    const item = raw as Record<string, unknown>;
    return {
      "Display Name": (item.display_name as string | null) ?? "",
      "Sender Email": (item.sender_email as string | null) ?? "",
      Date: (item.date as string | null) ?? "",
      Amount: (item.amount as number | null) ?? "",
      Currency: (item.currency as string | null) ?? "",
      Type: (item.type as string | null) ?? "",
      Status: (item.status as string | null) ?? "",
      "Invoice Number": (item.invoice_number as string | null) ?? "",
      "Zip Path": inboxZipPathById.get(item.id as string) ?? "",
    };
  });
  await writer.add("inbox.csv", Buffer.from(rowsToCsv(inboxCsvRows, "No inbox items for this organisation."), "utf-8"));

  const filePaths = await writer.finish();

  logger.info("Org export build complete", {
    exportId,
    orgId,
    filePaths,
    itemCount,
    skipped: skippedFiles.length,
    pdfStats,
    failedRenders: failedRenders.length,
  });

  return { filePaths, itemCount, skippedFiles, failedRenders, pdfStats };
}

// ── Signed URLs ─────────────────────────────────────────────────────────────

export async function signExportUrls(
  supabase: SupabaseClient,
  filePaths: string[],
  expiresInDays: number,
): Promise<string[]> {
  const expiresInSeconds = expiresInDays * 24 * 60 * 60;
  const urls: string[] = [];

  for (const path of filePaths) {
    const { data, error } = await supabase.storage
      .from("org-exports")
      .createSignedUrl(path, expiresInSeconds);
    if (error || !data?.signedUrl) {
      throw new Error(`Failed to generate signed URL for ${path}: ${error?.message ?? "no URL returned"}`);
    }
    urls.push(data.signedUrl);
  }

  return urls;
}
