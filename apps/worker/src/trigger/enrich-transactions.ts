import { task, logger, tasks } from "@trigger.dev/sdk";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject, embedMany } from "ai";
import { z } from "zod";
import { cleanTransactionDescription } from "../lib/clean-transaction-description";
import { supabase } from "../lib/supabase";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

// ─── Embeddings (for "apply category to similar transactions") ────────────────

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;

async function generateEmbeddings(
  txs: { id: string; name: string; counterparty_name: string | null }[],
  orgId: string,
) {
  if (!txs.length) return;

  const sourceTexts = txs.map((t) => [t.name, t.counterparty_name].filter(Boolean).join(" "));

  const { embeddings } = await embedMany({
    model: google.textEmbeddingModel(EMBEDDING_MODEL),
    values: sourceTexts,
    providerOptions: {
      google: {
        outputDimensionality: EMBEDDING_DIMENSIONS,
        taskType: "SEMANTIC_SIMILARITY",
      },
    },
  });

  const { error } = await supabase.from("transaction_embeddings").upsert(
    txs.map((t, i) => ({
      transaction_id: t.id,
      org_id: orgId,
      embedding: embeddings[i],
      source_text: sourceTexts[i],
      model: EMBEDDING_MODEL,
    })),
    { onConflict: "transaction_id" },
  );
  if (error) throw error;
}

// ─── Schema & thresholds (mirrors Midday's approach) ──────────────────────────

const CONFIDENCE = {
  CATEGORY_MIN: 0.7,
  MERCHANT_MIN: 0.6,
} as const;

// Category is an enum of the org's own category names (Midday constrains it the
// same way) so near-misses like "Grocery" vs "Groceries" can't silently drop.
function buildEnrichmentSchema(categoryNames: string[]) {
  const category =
    categoryNames.length > 0
      ? z.enum(categoryNames as [string, ...string[]]).nullable()
      : z.null();

  return z.object({
    merchant: z
      .string()
      .nullable()
      .describe("Clean, properly capitalized merchant or business name. No card numbers, reference numbers, dates, amounts, or location codes."),
    counterparty: z
      .string()
      .nullable()
      .describe("Who the money went to or came from. For card/POS purchases and merchant payments this is the merchant. For transfers it is the person or business on the other side. Null if unknowable."),
    category: category.describe("Category name from the provided list. Null if confidence < 0.7 or no good match."),
    merchantConfidence: z
      .number()
      .min(0)
      .max(1)
      .describe("Confidence in merchant name (0=unknown, 1=certain)"),
    categoryConfidence: z
      .number()
      .min(0)
      .max(1)
      .describe("Confidence in category assignment (0=unknown, 1=certain)"),
  });
}

type EnrichmentResult = z.infer<ReturnType<typeof buildEnrichmentSchema>>;

const BATCH_SIZE = 50;

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(
  batch: {
    name: string;
    original_name: string | null;
    counterparty_name: string | null;
    category_id: string | null;
    amount: number;
    currency: string;
    type: string;
  }[],
  categories: string[],
): string {
  const txList = batch
    .map((tx, i) => {
      // Input hierarchy mirrors Midday: existing counterparty, then the cleaned
      // line, then the raw bank line for context.
      const raw = tx.original_name ?? tx.name;
      const cleaned = cleanTransactionDescription(raw);
      const parts: string[] = [];
      if (tx.counterparty_name) parts.push(`Counterparty: ${tx.counterparty_name}`);
      if (cleaned && cleaned !== raw) parts.push(`Cleaned: "${cleaned}"`);
      parts.push(`Raw: "${raw}"`);
      parts.push(`${tx.amount} ${tx.currency} (${tx.type})`);
      return `${i + 1}. ${parts.join(" | ")}`;
    })
    .join("\n");

  const needsCategories = batch.some((tx) => !tx.category_id);
  const categorySection = !needsCategories
    ? "\nAll transactions are already categorized — return null for all category fields."
    : categories.length
    ? `\nAVAILABLE CATEGORIES (return exact name from this list, or null):\n${categories.join(", ")}`
    : "\nNo categories configured — return null for all category fields.";

  return `You are a transaction enrichment engine for a business accounting application serving East Africa and the Gulf region.

For each transaction, return:
1. "merchant" — Clean business name, properly capitalized, no reference numbers (e.g. "Talabat.com", "Safaricom PLC", "M-Pesa Transfer")
2. "counterparty" — Who the money went to or came from. For card/POS purchases and merchant payments, this is the merchant itself. For transfers, the person or business on the other side.
3. "category" — Best matching category. Null if confidence < 0.7.
4. "merchantConfidence" / "categoryConfidence" — Your confidence score 0–1.

INPUT: each transaction may have "Counterparty" (already known — trust it), "Cleaned" (the bank line with card numbers, dates, amounts and codes already stripped — usually the best source for the merchant) and "Raw" (the original bank line, for context).

CLEANING RULES (apply to every transaction, including formats not shown below):
- Ignore card numbers, POS/purchase prefixes, location codes (DUBAI:AE, :AE), store/terminal/authorization numbers, value dates, transaction dates and amounts
- Keep legal suffixes printed on the statement (LLC, FZE, FZCO, LTD, PLC) but don't invent ones that aren't there
- Drop trailing single-letter branch codes (e.g. "SUPERMARKET LLC B" → "Supermarket LLC")
- Use Title Case for ALL-CAPS names, but keep brand casing (talabat.com → "Talabat.com", DU → "DU")
- A clean merchant name extracted this way is a strong match — score it ≥ 0.8 even if you don't recognise the business

REGIONAL PATTERNS:
M-Pesa transfers:
- "Customer Transfer to - 07*******291 EUGENE OGUTU" → merchant: "M-Pesa Transfer", counterparty: "Eugene Ogutu", confidence: 0.95
- "Customer Payment to Small Business to 254720***218 - JOHN KAMAU" → merchant: "M-Pesa Payment", counterparty: "John Kamau", confidence: 0.95
- "Funds received from 254704***069 - ALICE WANJIRU" → merchant: "M-Pesa Received", counterparty: "Alice Wanjiru", confidence: 0.95
- "Customer Transfer of Funds Charge" → merchant: "M-Pesa Transaction Fee", counterparty: null, confidence: 0.98
- "Business Payment from 859551 - MALI. via API" → merchant: "Mali", counterparty: "Mali", confidence: 0.85
- "Merchant Payment to 5464614 - FASTMART SUPERMARKET" → merchant: "Fastmart Supermarket", counterparty: "Fastmart Supermarket", confidence: 0.90

UAE card transactions:
- "CARD NO.443913XXXXXX4326 talabat.com DUBAI:AE 782004 35.24,AED" → merchant: "Talabat.com", counterparty: "Talabat.com", confidence: 0.95
- "CARD NO.443913XXXXXX4326 TALIA PLUS MINI MART FZE Dubai:AE 919395" → merchant: "Talia Plus Mini Mart FZE", counterparty: "Talia Plus Mini Mart FZE", confidence: 0.92
- "CARD NO.443913XXXXXX4326 DU Apple Pay 800188:AE" → merchant: "DU Telecom", counterparty: "DU Telecom", confidence: 0.90
- "POS-PURCHASE CARD NO. 4439-1XXX-XXXX-5480 KADOOLI SUPERMARKET LLC B DUBAI:AE 21.50,AED 943422 09-08-2026 VALUE DATE:09-08-2026" → merchant: "Kadooli Supermarket LLC", counterparty: "Kadooli Supermarket LLC", confidence: 0.90
- "POS-PURCHASE CARD NO. 4439-1XXX-XXXX-5480 CARREFOUR MOE DUBAI:AE 112.75,AED 512893 03-08-2026 VALUE DATE:04-08-2026" → merchant: "Carrefour", counterparty: "Carrefour", confidence: 0.95

Reversals/refunds:
- "REV RMA 202606080006B98111608748362 Payment timeout" → merchant: "Payment Reversal", counterparty: null, confidence: 0.90
- "REFUND - Talabat.com" → merchant: "Refund — Talabat.com", counterparty: "Talabat.com", confidence: 0.95

Already clean descriptions (short, no reference numbers):
- "Equity Bank Charge" → merchant: "Equity Bank Charge", counterparty: null, confidence: 0.95
- "ATM Withdrawal" → merchant: "ATM Withdrawal", counterparty: null, confidence: 0.95

CONFIDENCE SCORING:
- 1.0: Exact match (Safaricom, Google, Uber)
- 0.8: Strong match with known entity
- 0.5: Best guess
- 0.3: Very uncertain
Only return category if confidence ≥ 0.7, otherwise null.
${categorySection}

Return EXACTLY ${batch.length} results in order. No skipping.

Transactions:
${txList}`;
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export const enrichTransactionsTask = task({
  id: "enrich-transactions",
  retry: { maxAttempts: 2 },

  run: async (payload: { transactionIds: string[]; orgId: string }) => {
    const { transactionIds, orgId } = payload;

    if (!transactionIds.length) return { enriched: 0 };

    // Embeddings must refresh on every edit, independent of the enrichment_completed
    // gate below — isolated in its own try/catch so a failure here never blocks
    // category/merchant enrichment.
    try {
      const { data: embedTargets, error: embedFetchError } = await supabase
        .from("transactions")
        .select("id, name, counterparty_name")
        .in("id", transactionIds);

      if (embedFetchError) throw embedFetchError;

      for (let i = 0; i < (embedTargets?.length ?? 0); i += BATCH_SIZE) {
        const batch = embedTargets!.slice(i, i + BATCH_SIZE);
        await generateEmbeddings(batch, orgId);
      }
    } catch (err) {
      logger.error("Embedding generation failed", { error: String(err) });
    }

    // Fetch transactions to enrich
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("id, name, original_name, counterparty_name, amount, currency, type, category_id, manual")
      .in("id", transactionIds)
      .eq("enrichment_completed", false);

    if (txError) throw txError;
    if (!transactions?.length) {
      logger.info("No transactions need enrichment");
      return { enriched: 0 };
    }

    // Fetch org's custom categories
    const { data: categories } = await supabase
      .from("transaction_categories")
      .select("id, name")
      .eq("org_id", orgId);

    const categoryNames = [...new Set(categories?.map((c) => c.name) ?? [])];
    const enrichmentSchema = buildEnrichmentSchema(categoryNames);

    let totalEnriched = 0;

    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE);

      try {
        const prompt = buildPrompt(batch, categoryNames);

        const { object: results } = await generateObject({
          model: google("gemini-2.5-flash-lite"),
          prompt,
          output: "array",
          schema: enrichmentSchema,
          temperature: 0.1,
        });

        const toProcess = Math.min(results.length, batch.length);

        // Build and apply updates in parallel
        const updates = (results as EnrichmentResult[])
          .slice(0, toProcess)
          .map((result, j): { id: string; patch: Record<string, unknown> } | null => {
            const tx = batch[j];
            if (!result || !tx) return null;

            const patch: Record<string, unknown> = { enrichment_completed: true };

            if (
              !tx.manual &&
              result.merchant &&
              result.merchant !== tx.name &&
              result.merchantConfidence >= CONFIDENCE.MERCHANT_MIN
            ) {
              patch.name = result.merchant;
              // Keep the bank's original line — written once, never overwritten
              if (!tx.original_name) patch.original_name = tx.name;
            }

            if (
              !tx.counterparty_name &&
              result.counterparty &&
              result.merchantConfidence >= CONFIDENCE.MERCHANT_MIN
            ) {
              patch.counterparty_name = result.counterparty;
            }

            if (
              !tx.category_id &&
              result.category &&
              result.categoryConfidence >= CONFIDENCE.CATEGORY_MIN
            ) {
              const matched = categories?.find((c) => c.name === result.category);
              if (matched) patch.category_id = matched.id;
            }

            return { id: tx.id, patch };
          })
          .filter((u): u is { id: string; patch: Record<string, unknown> } => u !== null);

        const updateResults = await Promise.all(
          updates.map(({ id, patch }) =>
            supabase.from("transactions").update(patch).eq("id", id),
          ),
        );
        const failedUpdates = updateResults.filter((r) => r.error);
        if (failedUpdates.length) {
          logger.error("Some enrichment updates failed", {
            count: failedUpdates.length,
            error: failedUpdates[0].error?.message,
          });
        }

        // Mark any unprocessed rows (LLM returned fewer results than batch) as done
        if (results.length < batch.length) {
          const processedIds = new Set(updates.map((u) => u.id));
          const unprocessedIds = batch
            .filter((tx) => !processedIds.has(tx.id))
            .map((tx) => tx.id);
          if (unprocessedIds.length) {
            await supabase
              .from("transactions")
              .update({ enrichment_completed: true })
              .in("id", unprocessedIds);
          }
        }

        totalEnriched += batch.length;
        logger.info("Enriched batch", {
          batchSize: batch.length,
          resultCount: results.length,
          merchantsRenamed: updates.filter((u) => "name" in u.patch).length,
          counterpartiesSet: updates.filter((u) => "counterparty_name" in u.patch).length,
          categoriesSet: updates.filter((u) => "category_id" in u.patch).length,
        });
      } catch (err) {
        // On error: mark all as completed to prevent infinite reprocessing
        logger.error("Enrichment batch failed — marking as completed", { error: String(err) });
        await supabase
          .from("transactions")
          .update({ enrichment_completed: true })
          .in("id", batch.map((tx) => tx.id));
        totalEnriched += batch.length;
      }
    }

    logger.info("Enrichment complete", { totalEnriched, orgId });

    // ── Reverse inbox matching (Batch 3h) ───────────────────────────────────
    // Runs here — after transaction_embeddings are written above — rather
    // than at transaction-creation time, because matching is embedding-driven:
    // triggering any earlier would find nothing to match against. Covers CSV
    // import, PDF/bank-statement import, and manual creation, since all of
    // them funnel through this task. Isolated try/catch: a trigger failure
    // here must not fail enrichment, which already succeeded.
    //
    // Debounced per org: a CSV import enriches in batches, so without this a
    // 500-row import would fire one batch-match run per batch — all of them
    // concurrently rescanning (and racing to attach) the same no_match items.
    // 30s trailing collapses them into a single run once enrichment settles.
    try {
      await tasks.trigger(
        "batch-match-inbox",
        { orgId, transactionIds },
        { debounce: { key: `batch-match-inbox-${orgId}`, delay: "30s", mode: "trailing" } },
      );
    } catch (err) {
      logger.warn("Could not trigger batch-match-inbox", { orgId, error: String(err) });
    }

    return { enriched: totalEnriched };
  },
});
