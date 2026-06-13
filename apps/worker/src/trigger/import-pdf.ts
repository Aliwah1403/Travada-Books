import { task, logger, metadata } from "@trigger.dev/sdk";
import { createHash } from "crypto";
import { supabase } from "../lib/supabase";
import { extractBankStatement } from "../lib/bank-statement-engine/extractor";
import type { BankTransactionRow } from "../lib/bank-statement-engine/schema";
import { enrichTransactionsTask } from "./enrich-transactions";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  payment_mode?: "mpesa" | "bank_transfer" | "card" | "cash" | "other";
};

// ─── Internal ID (same dedup logic as CSV import) ────────────────────────────

function generateInternalId(
  orgId: string,
  date: string,
  amount: number,
  description: string,
  reference: string | null | undefined,
  rowIndex: number,
): string {
  const key = reference?.trim()
    ? `${orgId}:ref:${reference.trim()}`
    : `${orgId}:${date}:${amount.toFixed(2)}:${description.toLowerCase().trim().slice(0, 50)}:${rowIndex}`;
  return createHash("sha256").update(key).digest("hex").slice(0, 32);
}

// ─── Map extracted row to DB shape ───────────────────────────────────────────

function resolvePaymentMode(
  row: BankTransactionRow,
  docType: "mpesa" | "bank" | null | undefined,
): ParsedRow["payment_mode"] {
  if (row.payment_method) return row.payment_method;
  if (docType === "mpesa") return "mpesa";
  if (docType === "bank") return "bank_transfer";
  return undefined;
}

function mapRow(
  row: BankTransactionRow,
  defaultCurrency: string,
  orgId: string,
  rowIndex: number,
  docType: "mpesa" | "bank" | null | undefined,
): ParsedRow {
  return {
    id: crypto.randomUUID(),
    internal_id: generateInternalId(orgId, row.date, row.amount, row.description, row.reference, rowIndex),
    date: row.date,
    name: row.description?.trim() || "Imported transaction",
    amount: Math.abs(row.amount), // guard against model returning negatives
    currency: row.currency?.toUpperCase() || defaultCurrency,
    type: row.type,
    reference_number: row.reference ?? undefined,
    payment_mode: resolvePaymentMode(row, docType),
  };
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export const importPdfTask = task({
  id: "import-pdf",
  maxDuration: 1800,
  retry: { maxAttempts: 1 }, // extraction is expensive — don't retry on content failures

  run: async (payload: {
    filePath: string;
    orgId: string;
    userId: string;
    orgName: string | null;
    defaultCurrency: string;
  }) => {
    const { filePath, orgId, userId, orgName, defaultCurrency } = payload;

    if (!filePath.startsWith(`${orgId}/imports/`) || filePath.includes("..")) {
      throw new Error(`Invalid filePath for org ${orgId}`);
    }

    metadata.set("status", "downloading");
    metadata.set("imported", 0);
    metadata.set("total", 0);

    // 1. Download PDF from vault
    logger.log("Downloading PDF", { filePath });
    const { data: fileData, error: dlError } = await supabase.storage
      .from("vault")
      .download(filePath);

    if (dlError || !fileData) throw new Error(`Failed to download PDF: ${dlError?.message}`);

    const arrayBuffer = await fileData.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // 2. Multi-pass AI extraction (Mistral → Gemini Flash → Gemini Pro)
    metadata.set("status", "extracting");
    logger.log("Starting multi-pass extraction", { orgName, size: pdfBuffer.length });

    const extraction = await extractBankStatement(pdfBuffer, orgName);
    const rawRows = extraction.data.transactions;

    logger.log("Extraction complete", {
      rows: rawRows.length,
      quality: extraction.quality.score,
      passes: extraction.passesUsed,
      currency: extraction.data.detected_currency,
      warnings: extraction.warnings,
    });

    if (rawRows.length === 0) {
      throw new Error("No transactions found in the PDF. The file may be password-protected, image-based, or not a bank statement.");
    }

    const detectedCurrency = extraction.data.detected_currency?.toUpperCase() || defaultCurrency;
    const docType = extraction.data.document_type;

    // 3. Map extracted rows to DB shape
    const rows: ParsedRow[] = rawRows.map((row, idx) =>
      mapRow(row, detectedCurrency, orgId, idx, docType),
    );

    metadata.set("total", rows.length);

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
        payment_mode: row.payment_mode ?? null,
        reference_number: row.reference_number ?? null,
        recurring: false,
        internal: false,
        manual: true,
      }));

      const { error } = await supabase.from("transactions").upsert(batch, {
        onConflict: "internal_id",
        ignoreDuplicates: true,
      });
      if (error) throw new Error(`Upsert batch failed: ${error.message}`);

      inserted += batch.length;
      metadata.set("imported", inserted);
    }

    // 5. Enrich — merchant name extraction + categorization (Gemini 2.5 Flash Lite, batch 50)
    metadata.set("status", "categorizing");
    await enrichTransactionsTask.triggerAndWait({
      transactionIds: rows.map((r) => r.id),
      orgId,
    });

    // 6. Clean up import file
    await supabase.storage.from("vault").remove([filePath]);

    metadata.set("status", "done");
    logger.log("PDF import complete", { imported: inserted, quality: extraction.quality.score, orgId });

    return {
      imported: inserted,
      skipped: rawRows.length - inserted,
      quality: extraction.quality.score,
      passesUsed: extraction.passesUsed,
      warnings: extraction.warnings,
    };
  },
});
