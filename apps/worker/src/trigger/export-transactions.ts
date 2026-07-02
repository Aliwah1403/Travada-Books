import { task, logger } from "@trigger.dev/sdk";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import React from "react";
import { render } from "@react-email/render";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { format as formatDate, parseISO } from "date-fns";
import { TransactionsExportedEmail } from "../emails/transactions-exported";

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

const FROM_EMAIL = "noreply@mail.travadasys.com";

const PAYMENT_MODE_LABELS: Record<string, string> = {
  mpesa: "M-Pesa",
  bank_transfer: "Bank Transfer",
  cash: "Cash",
  cheque: "Cheque",
  card: "Card",
  other: "Other",
};

const TAX_TYPE_LABELS: Record<string, string> = {
  vat: "VAT",
  wht: "WHT",
  other: "Other",
};

function escapeCell(value: string | number | null | undefined): string | number {
  if (typeof value !== "string") return value ?? "";
  // Prefix with a single quote if the value could be interpreted as a spreadsheet formula
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

const COLUMN_HEADERS = [
  "Date",
  "Name",
  "Counterparty",
  "Type",
  "Amount",
  "Currency",
  "Formatted Amount",
  "Category",
  "Status",
  "Payment Mode",
  "Reference Number",
  "Tax Amount",
  "Tax Rate (%)",
  "Tax Type",
  "Recurring",
  "Note",
  "Attachments",
];

function sanitizeFolderName(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, "-").trim().slice(0, 50);
}

function buildRow(tx: TransactionRow): (string | number)[] {
  const formattedAmount = new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: tx.currency ?? "KES",
    minimumFractionDigits: 2,
  }).format(tx.amount ?? 0);

  const raw: (string | number)[] = [
    tx.date ?? "",
    tx.name ?? "",
    tx.counterparty_name ?? "",
    tx.type === "income" ? "Income" : "Expense",
    tx.amount ?? "",
    tx.currency ?? "",
    formattedAmount,
    (tx.transaction_categories as { name?: string } | null)?.name ?? "",
    tx.status ? tx.status.charAt(0).toUpperCase() + tx.status.slice(1) : "",
    PAYMENT_MODE_LABELS[tx.payment_mode ?? ""] ?? tx.payment_mode ?? "",
    tx.reference_number ?? "",
    tx.tax_amount ?? "",
    tx.tax_rate ?? "",
    TAX_TYPE_LABELS[tx.tax_type ?? ""] ?? tx.tax_type ?? "",
    tx.recurring ? "Yes" : "No",
    tx.note ?? "",
    tx.transaction_attachments?.length
      ? `${tx.transaction_attachments.length} file${tx.transaction_attachments.length !== 1 ? "s" : ""}`
      : "None",
  ];
  return raw.map(escapeCell);
}

type TransactionRow = {
  id: string;
  date: string | null;
  name: string | null;
  counterparty_name: string | null;
  type: string | null;
  amount: number | null;
  currency: string | null;
  status: string | null;
  payment_mode: string | null;
  reference_number: string | null;
  tax_amount: number | null;
  tax_rate: number | null;
  tax_type: string | null;
  recurring: boolean | null;
  note: string | null;
  transaction_categories: { name: string } | null;
  transaction_attachments: { file_path: string; file_name: string }[];
};

export const exportTransactionsTask = task({
  id: "export-transactions",
  maxDuration: 300,
  retry: { maxAttempts: 2 },
  run: async (payload: {
    exportId: string;
    orgId: string;
    transactionIds: string[];
    format: "csv" | "xlsx";
    emailTo?: string;
  }) => {
    const { exportId, orgId, transactionIds, format, emailTo } = payload;
    const supabase = getSupabase();

    try {
      // ── 1. Fetch transactions ─────────────────────────────────────────────────
      logger.info("Fetching transactions for export", { exportId, count: transactionIds.length });

      const { data: transactions, error: fetchError } = await supabase
        .from("transactions")
        .select(`
          id, date, name, counterparty_name, type, amount, currency,
          status, payment_mode, reference_number,
          tax_amount, tax_rate, tax_type,
          recurring, note,
          transaction_categories(name),
          transaction_attachments(file_path, file_name)
        `)
        .eq("org_id", orgId)
        .in("id", transactionIds)
        .order("date", { ascending: false });

      if (fetchError) throw new Error(`Failed to fetch transactions: ${fetchError.message}`);
      if (!transactions?.length) throw new Error("No transactions found for export");

      // ── 2. Build rows ─────────────────────────────────────────────────────────
      const rows = (transactions as unknown as TransactionRow[]).map(buildRow);

      // ── 3. Generate file buffer ───────────────────────────────────────────────
      let fileBuffer: Buffer;
      let fileExt: string;
      let fileMimeType: string;

      if (format === "xlsx") {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([COLUMN_HEADERS, ...rows]);
        // Auto-width columns (approximate)
        ws["!cols"] = COLUMN_HEADERS.map((h) => ({ wch: Math.max(h.length + 2, 14) }));
        XLSX.utils.book_append_sheet(wb, ws, "Transactions");
        fileBuffer = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
        fileExt = "xlsx";
        fileMimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      } else {
        const csv = Papa.unparse({ fields: COLUMN_HEADERS, data: rows });
        fileBuffer = Buffer.from(csv, "utf-8");
        fileExt = "csv";
        fileMimeType = "text/csv";
      }

      // ── 4. Bundle attachments if any ──────────────────────────────────────────
      const txsWithAttachments = (transactions as unknown as TransactionRow[]).filter(
        (tx) => tx.transaction_attachments?.length > 0,
      );

      const timestamp = formatDate(new Date(), "yyyy-MM-dd-HHmm");
      let uploadBuffer: Buffer;
      let uploadPath: string;
      let uploadMime: string;

      if (txsWithAttachments.length > 0) {
        logger.info("Bundling attachments into ZIP", { count: txsWithAttachments.reduce((n, tx) => n + tx.transaction_attachments.length, 0) });

        const zip = new JSZip();
        zip.file(`transactions.${fileExt}`, fileBuffer);

        const attachmentsFolder = zip.folder("attachments")!;

        for (const tx of txsWithAttachments) {
          const folderName = `${tx.date ?? "unknown"} ${sanitizeFolderName(tx.name ?? "transaction")}`;
          const txFolder = attachmentsFolder.folder(folderName)!;

          for (const att of tx.transaction_attachments) {
            const { data: attData, error: attError } = await supabase.storage
              .from("vault")
              .download(att.file_path);

            if (attError || !attData) {
              logger.warn("Failed to download attachment, skipping", { file_path: att.file_path, error: attError?.message });
              continue;
            }

            txFolder.file(att.file_name, Buffer.from(await attData.arrayBuffer()));
          }
        }

        uploadBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
        uploadPath = `${orgId}/exports/transactions-${timestamp}.zip`;
        uploadMime = "application/zip";
      } else {
        uploadBuffer = fileBuffer;
        uploadPath = `${orgId}/exports/transactions-${timestamp}.${fileExt}`;
        uploadMime = fileMimeType;
      }

      // ── 5. Upload to vault ────────────────────────────────────────────────────
      logger.info("Uploading export to vault", { path: uploadPath });

      const { error: uploadError } = await supabase.storage
        .from("vault")
        .upload(uploadPath, uploadBuffer, { contentType: uploadMime, upsert: false });

      if (uploadError) throw new Error(`Failed to upload export: ${uploadError.message}`);

      // ── 6. Generate signed URL (7 days) ───────────────────────────────────────
      const { data: signedData, error: signedError } = await supabase.storage
        .from("vault")
        .createSignedUrl(uploadPath, 60 * 60 * 24 * 7);

      if (signedError || !signedData?.signedUrl) throw new Error(`Failed to generate signed URL: ${signedError?.message}`);

      const signedUrl = signedData.signedUrl;

      // ── 7. Update export record ───────────────────────────────────────────────
      await supabase
        .from("transaction_exports")
        .update({ status: "completed", file_path: uploadPath, row_count: transactions.length })
        .eq("id", exportId);

      // ── 8. Send email if requested ────────────────────────────────────────────
      if (emailTo) {
        logger.info("Sending export email", { emailTo, exportId });

        const { data: org } = await supabase
          .from("organizations")
          .select("name, logo_url")
          .eq("id", orgId)
          .single();

        const html = await render(
          React.createElement(TransactionsExportedEmail, {
            orgName: org?.name ?? "Your organisation",
            orgLogoUrl: org?.logo_url ?? null,
            rowCount: transactions.length,
            format,
            exportDate: new Date().toISOString(),
            downloadUrl: signedUrl,
          }),
        );

        const resend = new Resend(process.env.RESEND_API_KEY);
        const { error: emailError } = await resend.emails.send({
          from: `Travada Books <${FROM_EMAIL}>`,
          to: [emailTo],
          subject: `Transaction export ready — ${transactions.length} transaction${transactions.length !== 1 ? "s" : ""}`,
          html,
        });

        if (emailError) {
          logger.warn("Failed to send export email", { error: (emailError as { message: string }).message });
        }
      }

      logger.info("Export complete", { exportId, rowCount: transactions.length, path: uploadPath });
      return { filePath: uploadPath, signedUrl, rowCount: transactions.length };
    } catch (err) {
      logger.error("Export failed", { exportId, error: String(err) });
      await getSupabase()
        .from("transaction_exports")
        .update({ status: "failed", error: String(err) })
        .eq("id", exportId);
      throw err;
    }
  },
});
