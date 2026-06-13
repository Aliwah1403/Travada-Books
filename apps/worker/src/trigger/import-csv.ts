import { task, logger, metadata } from "@trigger.dev/sdk";
import Papa from "papaparse";
import { z } from "zod";
import { createHash } from "crypto";
import { supabase } from "../lib/supabase";
import { enrichTransactionsTask } from "./enrich-transactions";

// ─── Schema ───────────────────────────────────────────────────────────────────

const MappingSchema = z.object({
  date: z.string().optional(),
  description: z.string().optional(),
  amount: z.string().optional(),
  debit_column: z.string().optional(),
  credit_column: z.string().optional(),
  type: z.string().optional(),
  counterparty: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  currency: z.string().optional(),
  amount_sign: z.boolean().optional(),
});

type CsvMapping = z.infer<typeof MappingSchema>;

type ParsedRow = {
  id: string;
  internal_id: string;
  date: string;
  name: string;
  counterparty_name?: string;
  amount: number;
  currency: string;
  type: "income" | "expense";
  reference_number?: string;
  note?: string;
};

// ─── Parsing helpers ──────────────────────────────────────────────────────────

const MONTH_NAMES: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

function parseDate(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim();

  // ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Compact ISO: YYYYMMDD
  if (/^\d{8}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }

  // DD/MM/YYYY or MM/DD/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const numericParts = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (numericParts) {
    const a = parseInt(numericParts[1]);
    const b = parseInt(numericParts[2]);
    const year = numericParts[3].length === 2 ? `20${numericParts[3]}` : numericParts[3];
    // Unambiguous: if first part > 12 it must be day
    if (a > 12 && b <= 12) return `${year}-${numericParts[2].padStart(2, "0")}-${numericParts[1].padStart(2, "0")}`;
    // Unambiguous: if second part > 12 it must be day (US: MM/DD)
    if (b > 12 && a <= 12) return `${year}-${numericParts[1].padStart(2, "0")}-${numericParts[2].padStart(2, "0")}`;
    // Ambiguous — default to DD/MM (international convention)
    return `${year}-${numericParts[2].padStart(2, "0")}-${numericParts[1].padStart(2, "0")}`;
  }

  // "1 Oct 2025" or "1-Oct-2025"
  const dayMonthYear = s.match(/^(\d{1,2})[\s\-\/]([A-Za-z]{3,})[\s\-\.,]*(\d{4})$/);
  if (dayMonthYear) {
    const month = MONTH_NAMES[dayMonthYear[2].toLowerCase().slice(0, 3)];
    if (month) return `${dayMonthYear[3]}-${month}-${dayMonthYear[1].padStart(2, "0")}`;
  }

  // "Oct 1, 2025" or "October 1 2025"
  const monthDayYear = s.match(/^([A-Za-z]{3,})[\s\-](\d{1,2})[,\s]+(\d{4})$/);
  if (monthDayYear) {
    const month = MONTH_NAMES[monthDayYear[1].toLowerCase().slice(0, 3)];
    if (month) return `${monthDayYear[3]}-${month}-${monthDayYear[2].padStart(2, "0")}`;
  }

  // Last resort: Date constructor (handles many locale formats)
  const d = new Date(s);
  if (!isNaN(d.getTime()) && d.getFullYear() > 1970) {
    return d.toISOString().slice(0, 10);
  }

  return null;
}

function parseAmount(raw: string): number | null {
  if (!raw) return null;

  // Normalize special minus characters (−, –, —) to ASCII hyphen
  let s = raw.replace(/[−–—]/g, "-").trim();

  // Strip currency symbols, spaces, other non-numeric chars but keep . , - +
  s = s.replace(/[^\d.,\-+]/g, "");

  if (!s || s === "-" || s === "+") return null;

  const lastComma = s.lastIndexOf(",");
  const lastPeriod = s.lastIndexOf(".");

  let cleaned: string;
  if (lastComma > lastPeriod) {
    // EU format: 1.234,56 — comma is decimal separator
    cleaned = s.replace(/\./g, "").replace(",", ".");
  } else {
    // US/standard format: 1,234.56 — period is decimal separator
    cleaned = s.replace(/,/g, "");
  }

  const result = parseFloat(cleaned);
  return isNaN(result) ? null : result;
}

function generateInternalId(
  orgId: string,
  date: string,
  amount: number,
  description: string,
  reference: string | undefined,
  rowIndex: number,
): string {
  // Use reference number if available (bank-unique identifier)
  const key = reference?.trim()
    ? `${orgId}:ref:${reference.trim()}`
    : `${orgId}:${date}:${amount.toFixed(2)}:${description.toLowerCase().trim().slice(0, 50)}:${rowIndex}`;
  return createHash("sha256").update(key).digest("hex").slice(0, 32);
}

function mapRow(
  raw: Record<string, string>,
  mapping: CsvMapping,
  defaultCurrency: string,
  orgId: string,
  rowIndex: number,
): ParsedRow | null {
  const date = parseDate(mapping.date ? raw[mapping.date] ?? "" : "");
  if (!date) return null;

  const reference = mapping.reference ? raw[mapping.reference]?.trim() || undefined : undefined;

  let amount = 0;
  let type: "income" | "expense" = "expense";

  if (mapping.debit_column && mapping.credit_column) {
    const debit = parseAmount(raw[mapping.debit_column] ?? "") ?? 0;
    const credit = parseAmount(raw[mapping.credit_column] ?? "") ?? 0;
    if (debit > 0) { amount = debit; type = "expense"; }
    else if (credit > 0) { amount = credit; type = "income"; }
    else return null;
  } else if (mapping.amount) {
    const rawAmt = parseAmount(raw[mapping.amount] ?? "");
    if (rawAmt === null || rawAmt === 0) return null;
    amount = Math.abs(rawAmt);
    if (mapping.type) {
      const tv = (raw[mapping.type] ?? "").toLowerCase();
      type = tv.includes("credit") || tv.includes("income") || tv.includes("receipt")
        ? "income"
        : "expense";
    } else {
      type = mapping.amount_sign
        ? rawAmt > 0 ? "income" : "expense"
        : rawAmt > 0 ? "expense" : "income";
    }
  } else {
    return null;
  }

  const description = (mapping.description ? raw[mapping.description] : undefined)?.trim() || "Imported transaction";

  return {
    id: crypto.randomUUID(),
    internal_id: generateInternalId(orgId, date, amount, description, reference, rowIndex),
    date,
    name: description,
    counterparty_name: mapping.counterparty ? raw[mapping.counterparty]?.trim() || undefined : undefined,
    amount,
    currency: (() => {
      if (!mapping.currency) return defaultCurrency;
      // If the value is a known column header, look it up; otherwise treat as an ISO code
      const isColumn = Object.keys(raw).includes(mapping.currency);
      return (isColumn ? raw[mapping.currency]?.trim().toUpperCase() : mapping.currency.toUpperCase()) || defaultCurrency;
    })(),
    type,
    reference_number: reference,
    note: mapping.notes ? raw[mapping.notes]?.trim() || undefined : undefined,
  };
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export const importCsvTask = task({
  id: "import-csv",
  maxDuration: 1800,
  retry: { maxAttempts: 2 },

  run: async (payload: {
    filePath: string;
    mapping: CsvMapping;
    orgId: string;
    userId: string;
    defaultCurrency: string;
    rowCount: number;
  }) => {
    const { filePath, mapping, orgId, userId, defaultCurrency, rowCount } = payload;

    metadata.set("status", "downloading");
    metadata.set("total", rowCount);
    metadata.set("imported", 0);

    if (!filePath.startsWith(`${orgId}/imports/`) || filePath.includes("..")) {
      throw new Error(`Invalid filePath for org ${orgId}`);
    }

    // 1. Download CSV from vault
    logger.log("Downloading CSV from vault", { filePath });
    const { data: fileData, error: dlError } = await supabase.storage
      .from("vault")
      .download(filePath);

    if (dlError || !fileData) throw new Error(`Failed to download CSV: ${dlError?.message}`);

    const content = await fileData.text();

    // 2. Parse all rows
    metadata.set("status", "parsing");
    const parsed = Papa.parse<Record<string, string>>(content, {
      header: true,
      skipEmptyLines: true,
    });

    const rawRows = parsed.data;
    logger.log("CSV parsed", { total: rawRows.length, errors: parsed.errors.length });

    // 3. Map rows to transaction shape
    const rows: ParsedRow[] = rawRows
      .map((r, idx) => mapRow(r, mapping, defaultCurrency, orgId, idx))
      .filter((r) => r !== null) as ParsedRow[];

    const skipped = rawRows.length - rows.length;
    if (skipped > 0) logger.warn("Skipped rows with missing date/amount", { skipped });

    // 4. Upsert in batches — internal_id deduplicates re-imports
    metadata.set("status", "importing");
    const INSERT_BATCH = 500;
    let inserted = 0;

    for (let i = 0; i < rows.length; i += INSERT_BATCH) {
      const batch = rows.slice(i, i + INSERT_BATCH).map((row) => ({
        id: row.id,
        internal_id: row.internal_id,
        org_id: orgId,
        created_by: userId,
        date: row.date,
        name: row.name,
        counterparty_name: row.counterparty_name ?? null,
        amount: row.amount,
        currency: row.currency,
        type: row.type,
        status: "completed",
        reference_number: row.reference_number ?? null,
        note: row.note ?? null,
        recurring: false,
        internal: false,
        manual: true,
      }));

      // ignoreDuplicates: true — skip existing rows, don't overwrite categories
      const { error } = await supabase.from("transactions").upsert(batch, {
        onConflict: "internal_id",
        ignoreDuplicates: true,
      });
      if (error) throw new Error(`Upsert batch failed: ${error.message}`);

      inserted += batch.length;
      metadata.set("imported", inserted);
      logger.log("Batch upserted", { inserted, total: rows.length });
    }

    // 5. Enrich — merchant name extraction + categorization (Gemini 2.5 Flash Lite, batch 50)
    metadata.set("status", "categorizing");
    logger.log("Enriching transactions", { count: rows.length });
    await enrichTransactionsTask.triggerAndWait({
      transactionIds: rows.map((r) => r.id),
      orgId,
    });

    // 6. Clean up the import file from vault
    await supabase.storage.from("vault").remove([filePath]);

    metadata.set("status", "done");
    logger.log("Import complete", { imported: inserted, skipped, orgId });

    return { imported: inserted, skipped };
  },
});
