import { z } from "zod";

export const bankTransactionRowSchema = z.object({
  date: z.string().describe("Date in YYYY-MM-DD format"),
  description: z.string().describe("Transaction narration/description from the statement"),
  amount: z.number().describe("Transaction amount — always a positive number (absolute value), never negative"),
  type: z
    .enum(["income", "expense"])
    .describe("income = credit/deposit/received; expense = debit/withdrawal/payment"),
  currency: z
    .string()
    .nullable()
    .describe("ISO 4217 currency code (e.g. KES, USD, AED), null if not determinable"),
  reference: z
    .string()
    .nullable()
    .describe("Reference number, receipt number, transaction ID, or completion code if present, otherwise null"),
  balance: z
    .number()
    .nullable()
    .describe("Running account balance shown on this row after the transaction, null if not shown"),
  payment_method: z
    .enum(["mpesa", "bank_transfer", "card", "cash", "other"])
    .nullable()
    .describe("Payment method for this specific transaction — 'card' if description starts with CARD NO., 'mpesa' if from M-Pesa statement, otherwise inherit from document type or use null"),
});

export type BankTransactionRow = z.infer<typeof bankTransactionRowSchema>;

export const bankStatementSchema = z.object({
  transactions: z
    .array(bankTransactionRowSchema)
    .describe("ALL transaction rows from the statement — do not omit any row"),
  detected_currency: z
    .string()
    .nullable()
    .describe("Primary currency of the statement (e.g. KES, AED)"),
  account_holder: z.string().nullable().describe("Name of the account holder if shown"),
  statement_start: z
    .string()
    .nullable()
    .describe("Statement period start date in YYYY-MM-DD, null if not shown"),
  statement_end: z
    .string()
    .nullable()
    .describe("Statement period end date in YYYY-MM-DD, null if not shown"),
  document_type: z
    .enum(["mpesa", "bank"])
    .nullable()
    .describe("'mpesa' if document title/header mentions M-Pesa or Safaricom; 'bank' if it is a bank statement; null if unclear"),
});

export type BankStatementResult = z.infer<typeof bankStatementSchema>;
