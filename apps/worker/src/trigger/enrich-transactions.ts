import { task, logger } from "@trigger.dev/sdk";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { supabase } from "../lib/supabase";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

// ─── Schema & thresholds (mirrors Midday's approach) ──────────────────────────

const CONFIDENCE = {
  CATEGORY_MIN: 0.7,
  MERCHANT_MIN: 0.6,
} as const;

const enrichmentSchema = z.object({
  merchant: z
    .string()
    .nullable()
    .describe("Clean, properly capitalized merchant or business name. No reference numbers, dates, or amounts."),
  counterparty: z
    .string()
    .nullable()
    .describe("The other party (person name or business) if different from merchant — e.g. person name in M-Pesa transfer. Null otherwise."),
  category: z
    .string()
    .nullable()
    .describe("Category name from the provided list. Null if confidence < 0.7 or no good match."),
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

type EnrichmentResult = z.infer<typeof enrichmentSchema>;

const BATCH_SIZE = 50;

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(
  batch: { name: string; counterparty_name: string | null; amount: number; currency: string; type: string }[],
  categories: string[],
): string {
  const txList = batch
    .map((tx, i) => {
      const parts: string[] = [`${i + 1}. Description: "${tx.name}"`];
      if (tx.counterparty_name) parts.push(`Counterparty: ${tx.counterparty_name}`);
      parts.push(`${tx.amount} ${tx.currency} (${tx.type})`);
      return parts.join(" | ");
    })
    .join("\n");

  const categorySection = categories.length
    ? `\nAVAILABLE CATEGORIES (return exact name from this list, or null):\n${categories.join(", ")}`
    : "\nNo categories configured — return null for all category fields.";

  return `You are a transaction enrichment engine for a business accounting application serving East Africa and the Gulf region.

For each transaction, return:
1. "merchant" — Clean business name, properly capitalized, no reference numbers (e.g. "Talabat.com", "Safaricom PLC", "M-Pesa Transfer")
2. "counterparty" — The other party if different from merchant (e.g. person name in M-Pesa transfer). Null if same as merchant.
3. "category" — Best matching category. Null if confidence < 0.7.
4. "merchantConfidence" / "categoryConfidence" — Your confidence score 0–1.

REGIONAL PATTERNS:
M-Pesa transfers:
- "Customer Transfer to - 07*******291 EUGENE OGUTU" → merchant: "M-Pesa Transfer", counterparty: "Eugene Ogutu", confidence: 0.95
- "Customer Payment to Small Business to 254720***218 - JOHN KAMAU" → merchant: "M-Pesa Payment", counterparty: "John Kamau", confidence: 0.95
- "Funds received from 254704***069 - ALICE WANJIRU" → merchant: "M-Pesa Received", counterparty: "Alice Wanjiru", confidence: 0.95
- "Customer Transfer of Funds Charge" → merchant: "M-Pesa Transaction Fee", counterparty: null, confidence: 0.98
- "Business Payment from 859551 - MALI. via API" → merchant: "Mali", counterparty: null, confidence: 0.85
- "Merchant Payment to 5464614 - FASTMART SUPERMARKET" → merchant: "Fastmart Supermarket", counterparty: null, confidence: 0.90

UAE card transactions:
- "CARD NO.443913XXXXXX4326 talabat.com DUBAI:AE 782004 35.24,AED" → merchant: "Talabat.com", counterparty: null, confidence: 0.95
- "CARD NO.443913XXXXXX4326 TALIA PLUS MINI MART FZE Dubai:AE 919395" → merchant: "Talia Plus Mini Mart FZE", counterparty: null, confidence: 0.92
- "CARD NO.443913XXXXXX4326 DU Apple Pay 800188:AE" → merchant: "DU Telecom", counterparty: null, confidence: 0.90

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

    // Fetch transactions to enrich
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("id, name, counterparty_name, amount, currency, type, category_id")
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

    const categoryNames = categories?.map((c) => c.name) ?? [];

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

            if (result.merchant && result.merchantConfidence >= CONFIDENCE.MERCHANT_MIN) {
              patch.name = result.merchant;
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

        await Promise.all(
          updates.map(({ id, patch }) =>
            supabase.from("transactions").update(patch).eq("id", id),
          ),
        );

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
        logger.info("Enriched batch", { batchSize: batch.length, applied: updates.length });
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
    return { enriched: totalEnriched };
  },
});
