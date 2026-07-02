import { task, logger } from "@trigger.dev/sdk";
import { createMistral } from "@ai-sdk/mistral";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// ── Schema ────────────────────────────────────────────────────────────────────

const extractionSchema = z.object({
  tax_amount: z
    .number()
    .nullable()
    .describe("Tax amount shown on the document as a number (no symbols or commas). Null if not present."),
  tax_rate: z
    .number()
    .nullable()
    .describe("Tax rate as a percentage number, e.g. 16 for 16%. Null if not shown."),
  tax_type: z
    .enum(["vat", "sales_tax", "gst", "withholding_tax", "service_tax", "excise_tax", "reverse_charge", "custom_tax"])
    .nullable()
    .describe(
      "Type of tax: vat (VAT/MwSt/TVA/IVA), withholding_tax (WHT), sales_tax, gst (GST), service_tax, excise_tax, reverse_charge, custom_tax. Null if no tax is named.",
    ),
});

type ExtractionResult = z.infer<typeof extractionSchema>;

// ── Prompt ────────────────────────────────────────────────────────────────────

const PROMPT = `You are a tax extraction specialist. Extract ONLY tax-related fields from this financial document (receipt, invoice, or payment confirmation).

FIELDS TO EXTRACT:
- tax_amount: The explicit tax amount shown (e.g. "VAT KES 480" → 480, "Tax: 37.60" → 37.60). Return null if no tax amount appears.
- tax_rate: The tax rate as a percentage number (e.g. "16%" → 16, "VAT 16%" → 16, "8.5%" → 8.5). Return null if not shown.
- tax_type: One of:
  - "vat" — VAT, Value Added Tax, TVA, MwSt, IVA (common in Kenya at 16%)
  - "withholding_tax" — WHT, Withholding Tax
  - "sales_tax" — Sales Tax (common in USA)
  - "gst" — GST, Goods and Services Tax
  - "service_tax" — Service Tax, Service Charge
  - "excise_tax" — Excise Tax, Excise Duty
  - "reverse_charge" — Reverse Charge VAT
  - "custom_tax" — any other explicitly named tax type
  Return null if no tax type is named or no tax appears at all.

RULES:
- Return null for any field you cannot determine with confidence
- Never hallucinate values that are not present on the document
- For M-Pesa confirmations: these typically show no tax — return all nulls
- Numbers only for tax_amount — no currency symbols, no commas`;

// ── Model helpers ─────────────────────────────────────────────────────────────

async function fetchFileBytes(signedUrl: string): Promise<Uint8Array> {
  const res = await fetch(signedUrl);
  if (!res.ok) throw new Error(`Failed to fetch file: ${res.status} ${res.statusText}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function runExtraction(
  model: Parameters<typeof generateObject>[0]["model"],
  fileData: Uint8Array,
  contentType: string,
): Promise<ExtractionResult> {
  if (contentType === "application/pdf") {
    const { object } = await generateObject({
      model,
      schema: extractionSchema,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            { type: "text" as const, text: PROMPT },
            { type: "file" as const, data: fileData, mediaType: contentType as `${string}/${string}` },
          ],
        },
      ],
    });
    return object;
  }

  const { object } = await generateObject({
    model,
    schema: extractionSchema,
    temperature: 0,
    messages: [
      {
        role: "user",
        content: [
          { type: "text" as const, text: PROMPT },
          { type: "image" as const, image: fileData },
        ],
      },
    ],
  });
  return object;
}

async function extractWithMistral(fileData: Uint8Array, contentType: string): Promise<ExtractionResult> {
  const mistral = createMistral({ apiKey: process.env.MISTRAL_API_KEY! });
  return runExtraction(mistral("mistral-small-latest"), fileData, contentType);
}

async function extractWithGemini(fileData: Uint8Array, contentType: string): Promise<ExtractionResult> {
  const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY! });
  return runExtraction(google("gemini-2.5-flash"), fileData, contentType);
}

function hasAnyTaxData(result: ExtractionResult): boolean {
  return result.tax_amount !== null || result.tax_rate !== null || result.tax_type !== null;
}

function mapTaxType(raw: string | null): "vat" | "wht" | "other" | null {
  if (!raw) return null;
  if (raw === "vat") return "vat";
  if (raw === "withholding_tax") return "wht";
  return "other";
}

// ── Task ──────────────────────────────────────────────────────────────────────

export const processTransactionAttachmentTask = task({
  id: "process-transaction-attachment",
  maxDuration: 60,
  retry: { maxAttempts: 2 },
  queue: { concurrencyLimit: 50 },
  run: async (payload: {
    transactionId: string;
    orgId: string;
    filePath: string;
    contentType: string;
  }) => {
    const { transactionId, orgId, filePath, contentType } = payload;
    const supabase = getSupabase();

    // Only PDFs and images are processable
    const isProcessable = contentType === "application/pdf" || contentType.startsWith("image/");
    if (!isProcessable) {
      logger.info("Skipping non-processable content type", { contentType, filePath });
      return null;
    }

    // Fetch current tax fields — only update null ones
    const { data: tx, error: txError } = await supabase
      .from("transactions")
      .select("tax_amount, tax_rate, tax_type")
      .eq("id", transactionId)
      .eq("org_id", orgId)
      .single();

    if (txError || !tx) {
      throw new Error(`Transaction not found: ${txError?.message}`);
    }

    if (tx.tax_amount !== null && tx.tax_rate !== null && tx.tax_type !== null) {
      logger.info("All tax fields already set, skipping", { transactionId });
      return null;
    }

    // Signed URL valid for 5 minutes (enough for two model passes)
    const { data: signedData, error: urlError } = await supabase.storage
      .from("vault")
      .createSignedUrl(filePath, 300);

    if (urlError || !signedData?.signedUrl) {
      throw new Error(`Failed to get signed URL: ${urlError?.message}`);
    }

    // Fetch file bytes once — avoids passing localhost URLs to AI model APIs
    const fileData = await fetchFileBytes(signedData.signedUrl);
    logger.info("File downloaded", { transactionId, bytes: fileData.byteLength });

    // Pass 1: Mistral (primary — same as Midday)
    let extracted: ExtractionResult | null = null;
    try {
      logger.info("Pass 1: Mistral", { transactionId, contentType });
      extracted = await extractWithMistral(fileData, contentType);
      logger.info("Pass 1 result", { transactionId, ...extracted });
    } catch (err) {
      logger.warn("Pass 1 (Mistral) failed, falling back to Gemini", { error: String(err) });
    }

    // Pass 2: Gemini flash (fallback — if Mistral failed or returned all nulls)
    if (!extracted || !hasAnyTaxData(extracted)) {
      try {
        logger.info("Pass 2: Gemini fallback", { transactionId, contentType });
        extracted = await extractWithGemini(fileData, contentType);
        logger.info("Pass 2 result", { transactionId, ...extracted });
      } catch (err) {
        logger.warn("Pass 2 (Gemini) also failed", { error: String(err) });
      }
    }

    if (!extracted || !hasAnyTaxData(extracted)) {
      logger.info("No tax data found in attachment", { transactionId, filePath });
      return null;
    }

    // Build partial update — only fill in null fields, never overwrite user values
    const updates: Record<string, unknown> = {};
    if (tx.tax_amount === null && extracted.tax_amount !== null) {
      updates.tax_amount = extracted.tax_amount;
    }
    if (tx.tax_rate === null && extracted.tax_rate !== null) {
      updates.tax_rate = extracted.tax_rate;
    }
    if (tx.tax_type === null && extracted.tax_type !== null) {
      updates.tax_type = mapTaxType(extracted.tax_type);
    }

    if (Object.keys(updates).length === 0) {
      logger.info("No null tax fields to update", { transactionId });
      return null;
    }

    const { error: updateError } = await supabase
      .from("transactions")
      .update(updates)
      .eq("id", transactionId);

    if (updateError) throw new Error(`Failed to update transaction: ${updateError.message}`);

    logger.info("Tax data written to transaction", { transactionId, updates });
    return { transactionId, updates };
  },
});
