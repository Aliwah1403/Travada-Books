import { task, tasks, logger } from "@trigger.dev/sdk";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { embedMany } from "ai";
import { createClient } from "@supabase/supabase-js";
import convertHeic from "heic-convert";
import { extractDocumentDataTask } from "./extract-document-data";
import type { matchInboxTransactionsTask } from "./match-inbox-transactions";
import type { classifyDocumentTask } from "./classify-document";

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

// Same embedding model/dimensions as enrich-transactions.ts (transaction_embeddings) —
// inbox_embeddings must share the vector space to be comparable via match_inbox_candidates.
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;

// inbox_items has no updated_at column, so "processing set > 5 min ago" is
// approximated from created_at. Good enough in practice: this task normally
// starts within seconds of item creation, so a stale 'processing' row that's
// still stuck 5 minutes after creation is almost certainly an orphaned run.
const STUCK_THRESHOLD_MS = 5 * 60 * 1000;

// Statuses at/after which this item has already gone through analysis and
// matching (Batch 3b) — reprocessing would clobber a finished result.
const TERMINAL_STATUSES = new Set(["suggested_match", "no_match", "done", "archived", "deleted"]);

function mapDocumentType(docType: string | null | undefined): "invoice" | "expense" | "other" | null {
  if (docType === "invoice" || docType === "expense" || docType === "other") return docType;
  return null;
}

// iPhones photograph receipts as HEIC/HEIF — neither the extraction model nor
// browser <img>/<iframe> previews can read that format. Some senders (Resend
// inbound, some mail clients) also mislabel HEIC as application/octet-stream,
// so the filename extension is checked too, not just content_type.
function isHeicFile(contentType: string | null, fileName: string): boolean {
  const type = (contentType ?? "").toLowerCase();
  if (type === "image/heic" || type === "image/heif") return true;
  const lower = fileName.toLowerCase();
  return lower.endsWith(".heic") || lower.endsWith(".heif");
}

export const processInboxAttachmentTask = task({
  id: "process-inbox-attachment",
  maxDuration: 120,
  retry: { maxAttempts: 2 },
  run: async (payload: { inboxItemId: string }, { ctx }) => {
    const { inboxItemId } = payload;
    const supabase = getSupabase();
    const isRetry = ctx.attempt.number > 1;

    const { data: item, error: itemError } = await supabase
      .from("inbox_items")
      .select("id, org_id, file_path, content_type, file_name, display_name, website, status, created_at")
      .eq("id", inboxItemId)
      .single();

    if (itemError || !item) {
      throw new Error(`Inbox item not found: ${itemError?.message ?? inboxItemId}`);
    }

    // ── Idempotency / stuck recovery ────────────────────────────────────────
    if (TERMINAL_STATUSES.has(item.status)) {
      logger.info("Inbox item already processed, skipping", { inboxItemId, status: item.status });
      return { skipped: true, reason: "already_processed" };
    }

    // A 'processing' row means some run owns this item. Skip only if that run is
    // someone else's — on our own retry we ARE the owner, and skipping would
    // strand the item (a maxDuration timeout mid-extraction leaves 'processing'
    // behind, so the retry that exists to recover it must not bail out here).
    if (item.status === "processing" && !isRetry) {
      const ageMs = Date.now() - new Date(item.created_at).getTime();
      if (ageMs < STUCK_THRESHOLD_MS) {
        logger.info("Inbox item already processing (not stuck), skipping", { inboxItemId, ageMs });
        return { skipped: true, reason: "already_in_progress" };
      }
      logger.warn("Reprocessing stuck inbox item", { inboxItemId, ageMs });
    }

    await supabase.from("inbox_items").update({ status: "processing" }).eq("id", inboxItemId);

    // ── 0. HEIC/HEIF conversion ─────────────────────────────────────────────
    // Runs before extraction (which can't read HEIC) and before the file_path
    // is ever handed out as a signed URL (the browser preview can't render
    // HEIC either — converting here fixes both at once). Isolated try/catch:
    // on failure we fall through with the original HEIC file, and the
    // extraction step's content-type guard below marks the item 'pending'
    // rather than crashing the run.
    let filePath = item.file_path;
    let fileName = item.file_name;
    let contentType = item.content_type;

    if (isHeicFile(contentType, fileName)) {
      try {
        const { data: downloaded, error: downloadError } = await supabase.storage
          .from("vault")
          .download(filePath);

        if (downloadError || !downloaded) {
          throw new Error(`Failed to download HEIC source: ${downloadError?.message}`);
        }

        const inputBuffer = new Uint8Array(await downloaded.arrayBuffer());
        const outputBuffer = await convertHeic({ buffer: inputBuffer, format: "JPEG", quality: 0.85 });
        const jpegBytes = new Uint8Array(outputBuffer);

        // Same directory, extension swapped — the rand4 suffix already baked
        // into the original filename (both ingestion paths add one) carries
        // over untouched, so the new path stays unique.
        const newFileName = fileName.replace(/\.(heic|heif)$/i, ".jpg");
        const newPath = filePath.replace(/\.(heic|heif)$/i, ".jpg");

        const { error: uploadError } = await supabase.storage
          .from("vault")
          .upload(newPath, jpegBytes, { contentType: "image/jpeg", upsert: true });

        if (uploadError) throw uploadError;

        const heicPatch = {
          file_path: newPath,
          file_name: newFileName,
          content_type: "image/jpeg",
          size: jpegBytes.byteLength,
        };
        const { error: heicUpdateError } = await supabase
          .from("inbox_items")
          .update(heicPatch)
          .eq("id", inboxItemId);
        if (heicUpdateError) throw heicUpdateError;

        // The original HEIC upload already created a storage object and a
        // source='inbox' Vault document; the JPEG upload above created fresh
        // ones. Remove the HEIC leftovers so Vault shows only the readable JPEG,
        // not a broken .heic entry. Guarded: if the extension didn't actually
        // change (HEIC content-type but a .jpg filename), newPath == the old
        // path and we'd be deleting the file we just wrote.
        if (newPath !== filePath) {
          await supabase.storage.from("vault").remove([filePath]);
          await supabase.from("documents").delete().eq("file_path", filePath);
        }

        filePath = newPath;
        fileName = newFileName;
        contentType = "image/jpeg";

        logger.info("Converted HEIC to JPEG", { inboxItemId, newPath });
      } catch (err) {
        logger.error("HEIC conversion failed — continuing with original file", {
          inboxItemId,
          error: String(err),
        });
      }
    }

    // ── 1. Extraction ────────────────────────────────────────────────────────
    // Isolated try/catch: an extraction failure sets status='pending' (needs
    // manual attention) and returns early rather than crashing the run — mirrors
    // the isolation pattern in enrich-transactions.ts.
    let displayName = item.display_name ?? fileName;
    let website = item.website ?? null;

    try {
      if (!contentType || !(contentType === "application/pdf" || contentType.startsWith("image/"))) {
        logger.info("Non-processable content type, marking pending", { inboxItemId, contentType });
        await supabase.from("inbox_items").update({ status: "pending" }).eq("id", inboxItemId);
        return { skipped: true, reason: "non_processable_content_type" };
      }

      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", item.org_id)
        .single();
      const orgName = org?.name ?? "the organization";

      const { data: signedData, error: urlError } = await supabase.storage
        .from("vault")
        .createSignedUrl(filePath, 300);

      if (urlError || !signedData?.signedUrl) {
        throw new Error(`Failed to get signed URL: ${urlError?.message}`);
      }

      const result = await extractDocumentDataTask.triggerAndWait({
        signedUrl: signedData.signedUrl,
        contentType,
        orgName,
      });

      if (!result.ok) {
        throw new Error(`Extraction task failed: ${result.error}`);
      }

      const extracted = result.output;

      // Prefer the extracted counterparty as the display name when it reads
      // better than the raw filename we fell back to at upload time.
      if (extracted.counterparty_name) {
        displayName = extracted.counterparty_name;
      }

      const patch: Record<string, unknown> = {
        display_name: displayName,
        amount: extracted.amount,
        currency: extracted.currency,
        date: extracted.date,
        tax_amount: extracted.tax_amount,
        tax_rate: extracted.tax_rate,
        tax_type: extracted.tax_type,
        invoice_number: extracted.invoice_number,
        type: mapDocumentType(extracted.document_type),
        status: "analyzing",
      };

      const { error: updateError } = await supabase
        .from("inbox_items")
        .update(patch)
        .eq("id", inboxItemId);

      if (updateError) throw updateError;

      logger.info("Extraction complete", { inboxItemId, ...patch });
    } catch (err) {
      logger.error("Extraction failed — marking pending", { inboxItemId, error: String(err) });
      await supabase.from("inbox_items").update({ status: "pending" }).eq("id", inboxItemId);
      return { skipped: true, reason: "extraction_failed" };
    }

    // ── 2. Embedding ─────────────────────────────────────────────────────────
    // Isolated try/catch: embedding failure never blocks the matching trigger
    // below — the item just won't have embedding-based candidates until retried.
    try {
      const sourceText = [displayName, website].filter(Boolean).join(" ").trim();

      if (!sourceText) {
        logger.warn("No source text for embedding, skipping", { inboxItemId });
      } else {
        const { embeddings } = await embedMany({
          model: google.textEmbeddingModel(EMBEDDING_MODEL),
          values: [sourceText],
          providerOptions: {
            google: {
              outputDimensionality: EMBEDDING_DIMENSIONS,
              taskType: "SEMANTIC_SIMILARITY",
            },
          },
        });

        const { error: embedError } = await supabase.from("inbox_embeddings").upsert(
          {
            inbox_item_id: inboxItemId,
            org_id: item.org_id,
            embedding: embeddings[0],
            source_text: sourceText,
            model: EMBEDDING_MODEL,
          },
          { onConflict: "inbox_item_id" },
        );

        if (embedError) throw embedError;

        logger.info("Embedding written", { inboxItemId, sourceText });
      }
    } catch (err) {
      logger.error("Embedding generation failed", { inboxItemId, error: String(err) });
    }

    // ── 2b. Classify for Vault ───────────────────────────────────────────────
    // Inbox files also appear in Vault as source='inbox' documents (via the
    // handle_vault_upload trigger). Manual Vault uploads get an AI title/summary/
    // tags from classify-document; run the same task here so inbox files aren't
    // stuck showing only their raw filename in Vault. The documents row was
    // created at upload time; for a converted HEIC it's the JPEG row (filePath
    // is already the final .jpg here). Isolated + fire-and-forget — Vault polish
    // must never block or fail the inbox pipeline.
    try {
      const { data: doc } = await supabase
        .from("documents")
        .select("id")
        .eq("file_path", filePath)
        .maybeSingle();

      if (doc && contentType) {
        await tasks.trigger<typeof classifyDocumentTask>("classify-document", {
          documentId: doc.id,
          filePath,
          contentType,
          orgId: item.org_id,
        });
      } else {
        logger.warn("No Vault document to classify for inbox item", { inboxItemId, filePath });
      }
    } catch (err) {
      logger.error("Could not trigger classify-document for inbox file", {
        inboxItemId,
        error: String(err),
      });
    }

    // ── 3. Trigger matching ─────────────────────────────────────────────────
    // Deliberately NOT wrapped in a try/catch: an item left at 'analyzing' with
    // no matcher queued is stranded forever — it isn't 'no_match', so the daily
    // recheck sweep won't pick it up either. Let the throw fail the run so the
    // retry re-queues it.
    await tasks.trigger<typeof matchInboxTransactionsTask>("match-inbox-transactions", { inboxItemId });

    return { inboxItemId, status: "analyzing" };
  },
});
