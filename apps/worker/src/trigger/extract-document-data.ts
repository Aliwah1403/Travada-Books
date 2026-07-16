import { task } from "@trigger.dev/sdk";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export const extractDocumentSchema = z.object({
  date: z.string().nullable(),
  amount: z.number().nullable(),
  type: z.enum(["income", "expense"]).nullable(),
  counterparty_name: z.string().nullable(),
  description: z.string().nullable(),
  reference_number: z.string().nullable(),
  currency: z.string().nullable(),
  tax_amount: z.number().nullable(),
  tax_rate: z.number().nullable().describe("Tax rate as a percentage number, e.g. 16 for 16%. Null if not shown."),
  tax_type: z.enum(["vat", "wht", "other"]).nullable().describe("vat for VAT/TVA/MwSt/IVA, wht for Withholding Tax, other for any other named tax"),
  payment_mode: z.enum(["mpesa", "bank_transfer", "cash", "cheque", "card", "other"]).nullable(),
  invoice_number: z.string().nullable().describe("The invoice/bill/receipt number printed on the document, distinct from reference_number"),
  document_type: z.enum(["invoice", "expense", "other"]).nullable().describe("Doc-level classification: invoice (bill requesting/recording payment), expense (receipt/proof of payment), other (non-financial document)"),
});

export type ExtractedDocumentData = z.infer<typeof extractDocumentSchema>;

function buildPrompt(orgName: string): string {
  return [
    `<role>`,
    `You extract financial transaction data from receipts, invoices, bank slips, and M-Pesa confirmations uploaded by a business user.`,
    `</role>`,
    ``,
    `<context>`,
    `The business using this system is "${orgName}". Extract data from their perspective — they are either the payer or recipient.`,
    `</context>`,
    ``,
    `<rules>`,
    `- date: Use YYYY-MM-DD format. Kenyan documents (M-Pesa, KES, Kenyan business names) use DD/MM/YY — e.g. "7/3/26" = 2026-03-07. US documents use MM/DD/YY. When ambiguous, default to DD/MM/YY`,
    `- amount: Always a positive number. No currency symbol, no commas`,
    `- type: "income" if this org is receiving money, "expense" if they are paying`,
    `- counterparty_name: The other party — vendor name if expense, customer/sender name if income`,
    `- currency: ISO 4217 code. KES for Kenyan Shilling, USD, EUR, GBP, etc.`,
    `- For M-Pesa confirmations: amount is the transaction amount, not the resulting balance`,
    `- For M-Pesa: "Paid to" = expense, "received from" = income`,
    `- For bank statements showing multiple rows: extract ONLY the single most prominent transaction`,
    `- tax_amount: Only if a tax line is explicitly shown on the document`,
    `- tax_rate: The tax rate as a percentage number if shown (e.g. "VAT @ 5.00%" → 5, "16% VAT" → 16). Null if not shown`,
    `- tax_type: One of "vat" (VAT, Value Added Tax, TVA, MwSt, IVA), "wht" (Withholding Tax, WHT), or "other" (any other named tax). Null if no tax type is named`,
    `- payment_mode: One of "mpesa", "bank_transfer", "cash", "cheque", "card", or "other"`,
    `- invoice_number: The invoice/bill/receipt number printed on the document (e.g. "INV-2024-001"). Distinct from reference_number (a payment confirmation code). Null if not shown`,
    `- document_type: Classify the document itself: "invoice" if this is a bill requesting/recording payment, "expense" if this is a receipt/proof of payment already made, "other" if it is not a financial record. Independent of "type" (income/expense direction)`,
    `</rules>`,
    ``,
    `<examples>`,
    `Till receipt from "Naivas Supermarket", total KES 2,450, paid by card, dated 10 Jun 2026:`,
    `{ "date": "2026-06-10", "amount": 2450, "type": "expense", "counterparty_name": "Naivas Supermarket", "currency": "KES", "description": "Naivas Supermarket purchase", "payment_mode": "card" }`,
    ``,
    `M-Pesa: "You have received Ksh15,000.00 from JOHN KAMAU 0712345678 on 9/6/26":`,
    `{ "date": "2026-06-09", "amount": 15000, "type": "income", "counterparty_name": "John Kamau", "currency": "KES", "payment_mode": "mpesa" }`,
    `</examples>`,
    ``,
    `<constraints>`,
    `Return null for any field you cannot determine with confidence. Never hallucinate values.`,
    `If the image is blurry or text is unclear, return what you can read with confidence.`,
    `Never include commas, currency symbols, or spaces in the amount field — numbers only.`,
    `</constraints>`,
  ].join("\n");
}

export const extractDocumentDataTask = task({
  id: "extract-document-data",
  maxDuration: 60,
  retry: { maxAttempts: 2 },
  run: async (payload: {
    signedUrl: string;
    contentType: string;
    orgName: string;
  }) => {
    const { signedUrl, contentType, orgName } = payload;

    // Accept either a signed URL or an inline data URI from the edge function
    let base64: string;
    if (signedUrl.startsWith("data:")) {
      base64 = signedUrl.split(",")[1] ?? "";
    } else {
      const fileResponse = await fetch(signedUrl);
      if (!fileResponse.ok) throw new Error(`Failed to download file: ${fileResponse.status}`);
      const buffer = await fileResponse.arrayBuffer();
      base64 = Buffer.from(buffer).toString("base64");
    }

    const prompt = buildPrompt(orgName);

    const { object: extracted } = await generateObject({
      model: openai.chat("gpt-4o"),
      schema: extractDocumentSchema,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image", image: `data:${contentType};base64,${base64}` },
          ],
        },
      ],
      temperature: 0,
      providerOptions: { openai: { strictJsonSchema: false } },
    });

    return extracted;
  },
});
