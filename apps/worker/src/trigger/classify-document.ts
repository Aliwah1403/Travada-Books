import { task, logger } from "@trigger.dev/sdk";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

const classifierSchema = z.object({
  title: z
    .string()
    .nullable()
    .describe(
      "Descriptive, specific title for this document. Include key identifiers like invoice number, company names, dates. Examples: 'Invoice INV-2024-001 from Acme Corp', 'Receipt from Naivas Supermarket - 2024-03-15'. Never use generic names like 'Invoice', 'Receipt', or 'Document'.",
    ),
  summary: z
    .string()
    .nullable()
    .describe("Single sentence capturing the essence of this document."),
  tags: z
    .array(z.string())
    .max(5)
    .nullable()
    .describe(
      "Up to 5 relevant tags for classifying and searching the document. Prioritise: document type, key company/person names, main subject. Singular form. No date tags.",
    ),
  date: z
    .string()
    .nullable()
    .describe("Most relevant date in this document in YYYY-MM-DD format."),
});

const CLASSIFIER_PROMPT = `You are an expert multilingual document analyzer. Analyze the provided document and generate:

1. **title** (REQUIRED — never null): A descriptive, meaningful title suitable as a filename. Include key identifying information (document number, company names, dates). GOOD: "Invoice INV-2024-001 from Acme Corp", "M-Pesa Receipt from John Kamau - 2026-06-09". BAD: "Invoice", "Receipt", "Document".

2. **summary**: One sentence capturing the document's purpose (e.g., "Invoice from Supplier X for consulting services in May 2024").

3. **date**: The single most important date in the document (issue date, signing date, transaction date) in YYYY-MM-DD format.

4. **tags** (up to 5): Concise tags for classification and search. Always include the document type. Include key company/person names and the main subject. Singular form only. No generic or date-based tags.

Be precise. If text is unclear, extract what you can read with confidence.`;

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export const classifyDocumentTask = task({
  id: "classify-document",
  maxDuration: 120,
  retry: { maxAttempts: 2 },
  run: async (payload: {
    documentId: string;
    filePath: string;
    contentType: string;
    orgId: string;
  }) => {
    const { documentId, filePath, contentType } = payload;
    const supabase = getSupabase();

    await supabase
      .from("documents")
      .update({ processing_status: "processing" })
      .eq("id", documentId);

    try {
      const { data: fileData, error: dlError } = await supabase.storage
        .from("vault")
        .download(filePath);

      if (dlError || !fileData) {
        throw new Error(`Failed to download file: ${dlError?.message ?? "no data"}`);
      }

      const arrayBuffer = await fileData.arrayBuffer();

      logger.info("Running Gemini classification", { documentId, contentType });

      const { object: result } = await generateObject({
        model: google("gemini-2.5-flash"),
        schema: classifierSchema,
        temperature: 0.1,
        messages: [
          {
            role: "user",
            content: [
              { type: "text" as const, text: CLASSIFIER_PROMPT },
              { type: "file" as const, data: arrayBuffer, mediaType: contentType },
            ],
          },
        ],
      });

      // Fallback title from filename if AI returns null
      let finalTitle = result.title?.trim() || null;
      if (!finalTitle) {
        const baseName =
          filePath.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "Document";
        const datePart = result.date ? ` - ${result.date}` : "";
        finalTitle = `${baseName}${datePart}`;
        logger.warn("AI returned null title, using fallback", { documentId, finalTitle });
      }

      await supabase
        .from("documents")
        .update({
          title: finalTitle,
          summary: result.summary ?? null,
          tags: result.tags ?? null,
          processing_status: "completed",
        })
        .eq("id", documentId);

      logger.info("Classification complete", { documentId, title: finalTitle });
      return { title: finalTitle, tags: result.tags };
    } catch (err) {
      logger.error("Classification failed", { documentId, error: String(err) });
      await supabase
        .from("documents")
        .update({ processing_status: "failed" })
        .eq("id", documentId);
      throw err;
    }
  },
});
