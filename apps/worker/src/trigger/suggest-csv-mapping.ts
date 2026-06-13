import { task } from "@trigger.dev/sdk";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const csvMappingSchema = z.object({
  date: z.string().optional(),
  description: z.string().optional(),
  amount: z.string().optional(),
  debit_column: z.string().optional(),
  credit_column: z.string().optional(),
  type: z.string().optional(),
  counterparty: z.string().optional(),
  category: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  currency: z.string().optional(),
  amount_sign: z.boolean().optional(),
});

function buildPrompt(headers: string[], sampleRows: Record<string, string>[]): string {
  return [
    `<role>`,
    `You map column names from a CSV file to transaction fields for a bookkeeping application.`,
    `</role>`,
    ``,
    `<context>`,
    `Available CSV columns: ${headers.join(", ")}`,
    ``,
    `First rows of data:`,
    sampleRows.slice(0, 3).map((r) => JSON.stringify(r)).join("\n"),
    `</context>`,
    ``,
    `<rules>`,
    `- Return the exact CSV column name for each field, or omit if no confident match`,
    `- For "type": look for columns like Debit/Credit, Type, Transaction Type — return the column name`,
    `- For "amount_sign": set true if positive values represent income (deposits/credits), false if positive = expense`,
    `- For "currency": return a column name if one exists (e.g. "Currency", "CCY"), or detect the ISO code from amount values (e.g. "KES", "USD", "EUR")`,
    `- If a single amount column mixes credits/debits via sign (positive/negative), map it to "amount" and set "amount_sign" accordingly`,
    `- If separate debit and credit columns exist, map to "debit_column" and "credit_column" — leave "amount" empty`,
    `</rules>`,
    ``,
    `<examples>`,
    `Input columns: ["Txn Date", "Narration", "Debit", "Credit", "Running Balance"]`,
    `Output: { "date": "Txn Date", "description": "Narration", "debit_column": "Debit", "credit_column": "Credit" }`,
    ``,
    `Input columns: ["Date", "Description", "Amount", "Type", "Reference No"]`,
    `Output: { "date": "Date", "description": "Description", "amount": "Amount", "type": "Type", "reference": "Reference No", "amount_sign": true }`,
    ``,
    `Input columns: ["Transaction Date", "Particulars", "Withdrawal (Dr)", "Deposit (Cr)", "Currency", "Balance"]`,
    `Output: { "date": "Transaction Date", "description": "Particulars", "debit_column": "Withdrawal (Dr)", "credit_column": "Deposit (Cr)", "currency": "Currency" }`,
    `</examples>`,
    ``,
    `<constraints>`,
    `Return only a JSON object. Omit fields you are not confident about. Never guess or hallucinate column names not in the provided list.`,
    `</constraints>`,
  ].join("\n");
}

export const suggestCsvMappingTask = task({
  id: "suggest-csv-mapping",
  maxDuration: 60,
  retry: { maxAttempts: 2 },
  run: async (payload: { headers: string[]; sampleRows: Record<string, string>[] }) => {
    const { headers, sampleRows } = payload;
    const prompt = buildPrompt(headers, sampleRows);

    const { object: mapping } = await generateObject({
      model: openai.chat("gpt-4o-mini"),
      schema: csvMappingSchema,
      prompt,
      temperature: 0,
      providerOptions: { openai: { strictJsonSchema: false } },
    });

    return mapping;
  },
});
