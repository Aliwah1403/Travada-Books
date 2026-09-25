import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@trigger.dev/sdk";
import Papa from "papaparse";
import JSZip from "jszip";
import { format as formatDate } from "date-fns";

// ── Config ──────────────────────────────────────────────────────────────────

// Keep a running byte total per ZIP part; once adding a file would push it
// past this, finalise the part and start a new one. Uploaded immediately so
// we can drop the in-memory buffer before starting the next part.
const MAX_PART_BYTES = 400 * 1024 * 1024; // 400 MB

// Plain per-org tables exported as CSV (and, for three of them, also as a
// full-fidelity JSON dump — see FULL_JSON_TABLES). Deliberately excludes:
// inbox_accounts (OAuth tokens), *_embeddings, transaction_match_suggestions,
// dashboard_preferences, notification_settings, document_shares,
// inbox_blocklist, transaction_exports, and organization_members (members.csv
// covers that with joined user info instead of raw ids).
const EXPORT_TABLES = [
  "customers",
  "invoices",
  "invoice_payments",
  "invoice_recurring",
  "quotes",
  "statements",
  "transactions",
  "transaction_categories",
  "transaction_attachments",
  "documents",
  "vault_folders",
  "document_tags",
  "inbox_items",
  "invoice_templates",
  "quote_templates",
  "invoice_send_templates",
] as const;

// These also get a full-fidelity JSON dump alongside the flattened CSV, so
// nested line items / snapshots / custom_fields survive structured.
const FULL_JSON_TABLES = new Set(["invoices", "quotes", "statements"]);

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

  // ── organization.json ──────────────────────────────────────────────────
  await writer.add("organization.json", Buffer.from(JSON.stringify(org, null, 2), "utf-8"));

  // ── members.csv ────────────────────────────────────────────────────────
  logger.info("Exporting members", { exportId, orgId });
  const members = await buildMembersCsv(supabase, orgId, membersOverride);
  await writer.add("members.csv", Buffer.from(members.csv, "utf-8"));
  itemCount += members.count;

  // ── per-table CSV (+ JSON for invoices/quotes/statements) ─────────────
  for (const table of EXPORT_TABLES) {
    logger.info("Exporting table", { exportId, table });
    const rows = await pageTable(supabase, table, orgId);
    itemCount += rows.length;

    const csv = rowsToCsv(rows, `No ${table} rows for this organisation.`);
    await writer.add(`data/${table}.csv`, Buffer.from(csv, "utf-8"));

    if (FULL_JSON_TABLES.has(table)) {
      await writer.add(`data/${table}.json`, Buffer.from(JSON.stringify(rows, null, 2), "utf-8"));
    }
  }

  // ── storage files ───────────────────────────────────────────────────────
  const sources: StorageSource[] = [
    { bucket: "vault", prefix: orgId, skipPrefixes: [`${orgId}/exports`] },
    { bucket: "transaction-attachments", prefix: orgId },
    { bucket: "org-assets", prefix: `logos/${orgId}` },
  ];

  const skippedFiles: { path: string; reason: string }[] = [];

  for (const source of sources) {
    logger.info("Listing storage files", { exportId, bucket: source.bucket, prefix: source.prefix });
    const paths = await listStorageFilesRecursive(
      supabase,
      source.bucket,
      source.prefix,
      source.skipPrefixes,
    );

    for (const path of paths) {
      const { data, error } = await supabase.storage.from(source.bucket).download(path);
      if (error || !data) {
        logger.warn("Failed to download file for export, skipping", {
          bucket: source.bucket,
          path,
          error: error?.message,
        });
        skippedFiles.push({ path: `${source.bucket}/${path}`, reason: error?.message ?? "download failed" });
        continue;
      }

      const buffer = Buffer.from(await data.arrayBuffer());
      const zipPath = `files/${source.bucket}/${pathAfterOrgId(path, orgId)}`;
      await writer.add(zipPath, buffer);
    }
  }

  // ── README.txt ─────────────────────────────────────────────────────────
  const readmeLines = [
    `Travada Books — data export for ${orgName}`,
    `Exported: ${new Date().toISOString()}`,
    "",
    "Contents:",
    "  organization.json   — your organisation's profile fields",
    "  members.csv          — team members (name, email, role, status, joined)",
    "  data/<table>.csv     — one CSV per data table, all rows for this organisation",
    "  data/invoices.json, data/quotes.json, data/statements.json",
    "                        — the same records as full JSON, preserving nested",
    "                          line items, snapshots, and custom fields",
    "  files/<bucket>/…     — every file from your vault, transaction attachments,",
    "                          and business logo",
    "",
    "Note: invoice, quote, and statement PDFs are not included in this export.",
    "They are generated on demand from the data above and can be regenerated",
    "from it if needed.",
  ];

  if (skippedFiles.length > 0) {
    readmeLines.push("", "Files that could not be included:");
    for (const f of skippedFiles) {
      readmeLines.push(`  ${f.path} — ${f.reason}`);
    }
  }

  await writer.add("README.txt", Buffer.from(readmeLines.join("\n"), "utf-8"));

  const filePaths = await writer.finish();

  logger.info("Org export build complete", { exportId, orgId, filePaths, itemCount, skipped: skippedFiles.length });

  return { filePaths, itemCount, skippedFiles };
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
