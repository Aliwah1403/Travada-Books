import { AbortTaskRunError, logger, task, tasks } from "@trigger.dev/sdk";
import { supabase } from "../lib/supabase";
import {
  loadInvoiceForPdf,
  loadQuoteForPdf,
  loadStatementForPdf,
  renderInvoiceBuffer,
  renderQuoteBuffer,
  renderStatementBuffer,
  sanitizeFilenamePart,
} from "../lib/document-pdf";
import type { classifyDocumentTask } from "./classify-document";

// Renders an invoice/quote/statement PDF server-side, stores it in the vault
// (registering it as a Vault document), and — when sendEmail is true — asks
// the matching send-*-email edge function to attach it. See
// DOCUMENT-PDF-PLAN.md Phase 2 ("Worker task").
//
// Always renders from the document's stored snapshots (from_details,
// customer_details / snapshot_data) — correct for anything that reaches this
// task, since it's only ever invoked for documents that have already been
// sent at least once (drafts don't have snapshots and are never emailed).

type DocumentKind = "invoice" | "quote" | "statement";

type GenerateDocumentPdfPayload = {
  kind: DocumentKind;
  id: string;
  sendEmail: boolean;
};

const EDGE_FUNCTION_BY_KIND: Record<DocumentKind, string> = {
  invoice: "send-invoice-email",
  quote: "send-quote-email",
  statement: "send-statement-email",
};

const ID_KEY_BY_KIND: Record<DocumentKind, string> = {
  invoice: "invoiceId",
  quote: "quoteId",
  statement: "statementId",
};

const TABLE_BY_KIND: Record<DocumentKind, "invoices" | "quotes" | "statements"> = {
  invoice: "invoices",
  quote: "quotes",
  statement: "statements",
};

async function postSendEmail(
  kind: DocumentKind,
  id: string,
  extra: Record<string, unknown>,
  // Stable across retries of the same task run (but distinct per run), so a
  // network blip that makes the worker retry after the edge function's
  // resend.emails.send() already succeeded doesn't double-email the customer
  // — the edge function forwards this as Resend's own idempotency key.
  runId: string,
): Promise<void> {
  const idKey = ID_KEY_BY_KIND[kind];
  const fnName = EDGE_FUNCTION_BY_KIND[kind];

  // The edge functions recognise the worker by this secret. Without it they
  // fall back to comparing the service-role key, which fails whenever the two
  // runtimes hold different key formats (locally: sb_secret_… vs the legacy
  // JWT) — and the request is then treated as an anonymous user (401).
  const workerSecret = process.env.WORKER_SHARED_SECRET;
  if (!workerSecret) {
    throw new AbortTaskRunError("WORKER_SHARED_SECRET is not set in the worker environment");
  }

  const res = await fetch(`${process.env.SUPABASE_URL}/functions/v1/${fnName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "X-Worker-Secret": workerSecret,
    },
    body: JSON.stringify({ [idKey]: id, resendIdempotencyKey: `generate-document-pdf-${runId}`, ...extra }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const message = `${fnName} responded ${res.status}: ${body}`;
    // Auth and validation failures won't fix themselves on retry.
    if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
      throw new AbortTaskRunError(message);
    }
    throw new Error(message);
  }
}

async function getInvoicesFolderId(orgId: string): Promise<string | null> {
  const { data } = await supabase
    .from("vault_folders")
    .select("id")
    .eq("org_id", orgId)
    .eq("is_system", true)
    .eq("name", "Invoices")
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

async function upsertVaultDocument(params: {
  orgId: string;
  filePath: string;
  fileSize: number;
  name: string;
  title: string;
  date: string | null;
  source: DocumentKind;
  folderId: string | null;
  createdBy: string | null;
  isFirstGeneration: boolean;
}): Promise<void> {
  const { data: doc, error } = await supabase
    .from("documents")
    .upsert(
      {
        org_id: params.orgId,
        name: params.name,
        title: params.title,
        file_path: params.filePath,
        file_size: params.fileSize,
        content_type: "application/pdf",
        source: params.source,
        folder_id: params.folderId,
        date: params.date,
        created_by: params.createdBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "file_path" },
    )
    .select("id")
    .single();

  if (error || !doc) {
    throw new Error(`Failed to upsert vault document for ${params.filePath}: ${error?.message ?? "no data"}`);
  }

  // Only classify on first insert (as Midday queues process-document once per
  // upload) — regenerating on resend just refreshes file_size/updated_at.
  // Fire-and-forget: Vault polish must never block or fail PDF generation.
  if (params.isFirstGeneration) {
    try {
      await tasks.trigger<typeof classifyDocumentTask>("classify-document", {
        documentId: doc.id as string,
        filePath: params.filePath,
        contentType: "application/pdf",
        orgId: params.orgId,
      });
    } catch (err) {
      logger.error("Could not trigger classify-document for generated PDF", {
        filePath: params.filePath,
        error: String(err),
      });
    }
  }
}

// Whether a documents row already exists for this path — checked BEFORE
// upload. The `on_vault_upload` storage trigger inserts a placeholder
// documents row (source='upload') synchronously on first upload, so checking
// after upload would make every "first ever" generation look like a
// regenerate.
async function hasExistingVaultDocument(filePath: string): Promise<boolean> {
  const { data } = await supabase.from("documents").select("id").eq("file_path", filePath).maybeSingle();
  return !!data;
}

async function generateInvoicePdf(invoiceId: string, sendEmail: boolean, runId: string) {
  const invoice = await loadInvoiceForPdf(supabase, invoiceId);

  const filenameBase = sanitizeFilenamePart(invoice.invoice_number ?? invoice.id);
  const filePath = `${invoice.org_id}/invoices/${invoice.id}/${filenameBase}.pdf`;
  const isFirstGeneration = !(await hasExistingVaultDocument(filePath));

  logger.info("Rendering invoice PDF", { invoiceId, filePath });

  const buffer = await renderInvoiceBuffer(invoice);

  const { error: uploadError } = await supabase.storage
    .from("vault")
    .upload(filePath, buffer, { contentType: "application/pdf", upsert: true });
  if (uploadError) throw new Error(`Failed to upload invoice PDF: ${uploadError.message}`);

  const pdfGeneratedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("invoices")
    .update({ file_path: filePath, file_size: buffer.byteLength, pdf_generated_at: pdfGeneratedAt })
    .eq("id", invoiceId);
  if (updateError) throw new Error(`Failed to update invoice with PDF metadata: ${updateError.message}`);

  const customerName =
    (invoice.customer_details as { name?: string } | null)?.name ?? invoice.customer_name ?? "Customer";

  await upsertVaultDocument({
    orgId: invoice.org_id,
    filePath,
    fileSize: buffer.byteLength,
    name: `${filenameBase}.pdf`,
    title: `Invoice ${invoice.invoice_number ?? invoice.id} — ${customerName}`,
    date: invoice.issue_date,
    source: "invoice",
    folderId: await getInvoicesFolderId(invoice.org_id),
    createdBy: invoice.user_id ?? null,
    isFirstGeneration,
  });

  if (sendEmail) await postSendEmail("invoice", invoiceId, { attachPdf: true }, runId);

  return { filePath, fileSize: buffer.byteLength };
}

async function generateQuotePdf(quoteId: string, sendEmail: boolean, runId: string) {
  const quote = await loadQuoteForPdf(supabase, quoteId);

  const filenameBase = sanitizeFilenamePart(quote.quote_number ?? quote.id);
  const filePath = `${quote.org_id}/quotes/${quote.id}/${filenameBase}.pdf`;
  const isFirstGeneration = !(await hasExistingVaultDocument(filePath));

  logger.info("Rendering quote PDF", { quoteId, filePath });

  const buffer = await renderQuoteBuffer(quote);

  const { error: uploadError } = await supabase.storage
    .from("vault")
    .upload(filePath, buffer, { contentType: "application/pdf", upsert: true });
  if (uploadError) throw new Error(`Failed to upload quote PDF: ${uploadError.message}`);

  const pdfGeneratedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("quotes")
    .update({ file_path: filePath, file_size: buffer.byteLength, pdf_generated_at: pdfGeneratedAt })
    .eq("id", quoteId);
  if (updateError) throw new Error(`Failed to update quote with PDF metadata: ${updateError.message}`);

  const customerName =
    (quote.customer_details as { name?: string } | null)?.name ?? quote.customer_name ?? "Customer";

  await upsertVaultDocument({
    orgId: quote.org_id,
    filePath,
    fileSize: buffer.byteLength,
    name: `${filenameBase}.pdf`,
    title: `Quote ${quote.quote_number ?? quote.id} — ${customerName}`,
    date: quote.issue_date,
    source: "quote",
    folderId: null, // Quotes have no system Vault folder — land at root.
    createdBy: quote.user_id ?? null,
    isFirstGeneration,
  });

  if (sendEmail) await postSendEmail("quote", quoteId, { attachPdf: true }, runId);

  return { filePath, fileSize: buffer.byteLength };
}

async function generateStatementPdf(statementId: string, sendEmail: boolean, runId: string) {
  const statement = await loadStatementForPdf(supabase, statementId);

  const filenameBase = sanitizeFilenamePart(`statement-${statement.date_from}-${statement.date_to}`);
  const filePath = `${statement.org_id}/statements/${statement.id}/${filenameBase}.pdf`;
  const isFirstGeneration = !(await hasExistingVaultDocument(filePath));

  logger.info("Rendering statement PDF", { statementId, filePath });

  const buffer = await renderStatementBuffer(supabase, statement);

  const { error: uploadError } = await supabase.storage
    .from("vault")
    .upload(filePath, buffer, { contentType: "application/pdf", upsert: true });
  if (uploadError) throw new Error(`Failed to upload statement PDF: ${uploadError.message}`);

  const pdfGeneratedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("statements")
    .update({ file_path: filePath, file_size: buffer.byteLength, pdf_generated_at: pdfGeneratedAt })
    .eq("id", statementId);
  if (updateError) throw new Error(`Failed to update statement with PDF metadata: ${updateError.message}`);

  const customerName = (statement.customer_details as { name?: string } | null)?.name ?? "Customer";

  await upsertVaultDocument({
    orgId: statement.org_id,
    filePath,
    fileSize: buffer.byteLength,
    name: `${filenameBase}.pdf`,
    title: `Statement ${statement.date_from} – ${statement.date_to} — ${customerName}`,
    date: statement.date_to,
    source: "statement",
    folderId: null, // Statements have no system Vault folder — land at root.
    createdBy: null, // statements has no user_id column.
    isFirstGeneration,
  });

  if (sendEmail) await postSendEmail("statement", statementId, { attachPdf: true }, runId);

  return { filePath, fileSize: buffer.byteLength };
}

export const generateDocumentPdf = task({
  id: "generate-document-pdf",
  retry: { maxAttempts: 3 },
  // If rendering/upload ultimately fails after retries and the caller wanted
  // this send emailed, the customer must still get the email — just without
  // the attachment. skipPdf tells the edge function to send today's
  // no-attachment email even though include_pdf is true.
  onFailure: async ({ payload, ctx }: { payload: GenerateDocumentPdfPayload; ctx: { run: { id: string } } }) => {
    if (!payload.sendEmail) return;
    try {
      await postSendEmail(payload.kind, payload.id, { attachPdf: false, skipPdf: true }, ctx.run.id);
    } catch (err) {
      logger.error("generate-document-pdf onFailure: fallback send also failed", {
        kind: payload.kind,
        id: payload.id,
        error: String(err),
      });
      // The edge function never got a chance to record anything (the callback
      // itself failed) — the customer got no email at all. Write it directly
      // with the worker's own service-role client so the app doesn't keep
      // showing "queued" forever.
      const { error: updateError } = await supabase
        .from(TABLE_BY_KIND[payload.kind])
        .update({
          email_status: "failed",
          email_error: "Couldn't send the email. The PDF could not be generated and the fallback send failed.",
          email_status_at: new Date().toISOString(),
        })
        .eq("id", payload.id)
        // Only while still "queued": if the edge function reached Resend and
        // recorded the real rejection reason, keep that more useful message.
        .eq("email_status", "queued");
      if (updateError) {
        logger.error("generate-document-pdf onFailure: failed to write email_status", {
          kind: payload.kind,
          id: payload.id,
          error: updateError.message,
        });
      }
    }
  },
  run: async (payload: GenerateDocumentPdfPayload, { ctx }) => {
    const { kind, id, sendEmail } = payload;
    const runId = ctx.run.id;

    if (kind === "invoice") return await generateInvoicePdf(id, sendEmail, runId);
    if (kind === "quote") return await generateQuotePdf(id, sendEmail, runId);
    return await generateStatementPdf(id, sendEmail, runId);
  },
});
