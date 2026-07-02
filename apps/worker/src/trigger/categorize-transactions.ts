import { task } from "@trigger.dev/sdk";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const BATCH_SIZE = 50;

interface CategorizationRow {
  id: string;
  description: string;
  counterparty: string;
}

function buildPrompt(categories: string[], rows: CategorizationRow[]): string {
  return [
    `<role>`,
    `You assign categories to financial transactions for a bookkeeping application. You are fast and precise.`,
    `</role>`,
    ``,
    `<context>`,
    `Available categories:\n${categories.join(", ")}`,
    ``,
    `Transactions to categorize:\n${JSON.stringify(rows, null, 2)}`,
    `</context>`,
    ``,
    `<rules>`,
    `- Return a JSON object mapping each transaction id to a category name from the list above (exact match)`,
    `- Use "Uncategorized" only if genuinely no category fits`,
    `- Common Kenya-specific patterns:`,
    `  - "Safaricom" / "M-Pesa fee" / "service charge" → "Bank & Transaction Fees"`,
    `  - "Kenya Power" / "KPLC" / "Nairobi Water" / utility companies → "Utilities"`,
    `  - "Naivas" / "Carrefour" / "Quickmart" / supermarkets → "Office Supplies" (assume business context)`,
    `  - "salary" / "payroll" / "wages" / staff names → "Salaries & Wages"`,
    `  - "rent" / "lease" / "office" → "Rent & Lease"`,
    `  - "fuel" / "petrol" / "diesel" / "Total Kenya" / "Rubis" → "Travel & Transportation"`,
    `  - "internet" / "Safaricom Home" / "Zuku" / "Airtel" → "Utilities"`,
    `  - "advertising" / "Facebook ads" / "Google ads" / "marketing" → "Advertising & Marketing"`,
    `</rules>`,
    ``,
    `<examples>`,
    `Input: [{"id":"a","description":"Kenya Power bill","counterparty":"KPLC"},{"id":"b","description":"Staff salary June","counterparty":"Jane Wanjiku"},{"id":"c","description":"M-Pesa transfer fee","counterparty":"Safaricom"}]`,
    `Output: { "a": "Utilities", "b": "Salaries & Wages", "c": "Bank & Transaction Fees" }`,
    `</examples>`,
    ``,
    `<constraints>`,
    `Return only a flat JSON object mapping id strings to category name strings. No explanation, no markdown, no extra fields.`,
    `</constraints>`,
  ].join("\n");
}

export const categorizeTransactionsTask = task({
  id: "categorize-transactions",
  maxDuration: 300,
  retry: { maxAttempts: 2 },
  run: async (payload: { rows: CategorizationRow[]; categoryNames: string[] }) => {
    const { rows, categoryNames } = payload;
    const result: Record<string, string> = {};

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const prompt = buildPrompt(categoryNames, batch);

      const { object: batchResult } = await generateObject({
        model: openai.chat("gpt-4o-mini"),
        schema: z.record(z.string()),
        prompt,
        temperature: 0,
        providerOptions: { openai: { strictJsonSchema: false } },
      });

      for (const [id, category] of Object.entries(batchResult)) {
        if (categoryNames.includes(category) || category === "Uncategorized") {
          result[id] = category;
        }
      }
    }

    return result;
  },
});
