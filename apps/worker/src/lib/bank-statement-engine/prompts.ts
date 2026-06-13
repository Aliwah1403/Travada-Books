const BASE = `You are a bank statement parser. Your task is to extract ALL transactions from a bank statement PDF.

CRITICAL RULES:
1. Extract EVERY transaction row — do not skip, truncate, or stop early regardless of statement length
2. "amount" is ALWAYS a positive number — take the absolute value. If the Withdrawn or Debit column shows -300.00, amount = 300, type = "expense"
3. "type" is "income" if money came IN, "expense" if money went OUT — determined ONLY by which column has the value, NEVER by the description text
4. IGNORE opening balance rows, closing balance rows, brought forward rows, and subtotal/total summary rows — these are NOT transactions
5. IGNORE table headers and section dividers
6. "balance" is the running balance shown on the same row — DO NOT confuse it with the transaction amount
7. Detect the document type from the title/header: "M-Pesa Statement" or any Safaricom branding → document_type: "mpesa". Any bank name → document_type: "bank"`

const FIELD_RULES = `
FIELD RULES:
- date: Convert all formats to YYYY-MM-DD. "01/06/2025" → "2025-06-01". "1 Jun 2025" → "2025-06-01". "23/01/2025 14:32" → "2025-01-23". For M-Pesa: "Completion Time" column is the date
- amount: ALWAYS positive (absolute value). Examples: "-300.00" → 300. "-7.00" → 7. For separate Debit/Credit columns: use the non-zero value, always positive
- type: Determined ONLY by WHICH COLUMN contains the amount — NEVER by the description text
  • English: "Debit" column has value → "expense". "Credit" column has value → "income"
  • English: "Withdrawn" or "Money Out" or "Debit Amount" column has value → "expense"
  • English: "Paid In" or "Money In" or "Credit Amount" column has value → "income"
  • Arabic: "مدين" (Debit) has value → "expense". "دائن" (Credit) has value → "income"
  • Dr/Cr indicator column: "DR" or "D" → "expense". "CR" or "C" → "income"
  • IMPORTANT: Description words like "REV", "Reversal", "Refund", "Payment timeout", "Charge" do NOT change the type — the column position always decides
- currency: Use the statement-level currency for all rows. Default "KES" for Kenyan banks/M-Pesa, "AED" for UAE banks
- reference: M-Pesa: "Receipt No." column. Bank: "Ref No", "Transaction ID", "Cheque No", "Completion Code". Use null if no dedicated column
- balance: The running balance shown on the same row — null if column doesn't exist
- payment_method per transaction:
  • Description starts with "CARD NO." → "card"
  • Document is M-Pesa statement → "mpesa" for all rows
  • Otherwise null (will inherit document_type at import time)`;

const EXAMPLES = `
EXAMPLES:

KCB Bank — columns: Date | Value Date | Description | Debit | Credit | Balance
Row: "15/01/2025 | 15/01/2025 | MPESA TRANSFER FROM JOHN KAMAU | | 15,000.00 | 47,230.00"
→ { date: "2025-01-15", description: "MPESA TRANSFER FROM JOHN KAMAU", amount: 15000, type: "income", currency: "KES", reference: null, balance: 47230 }

Equity Bank — columns: Date | Description | Dr/Cr | Amount | Balance
Row: "20 Jan 2025 | Merchant Payment Java House | DR | 2,450.00 | 44,780.00"
→ { date: "2025-01-20", description: "Merchant Payment Java House", amount: 2450, type: "expense", currency: "KES", reference: null, balance: 44780 }

M-Pesa — columns: Receipt No. | Completion Time | Details | Transaction Status | Paid In | Withdrawn | Balance
Row: "UF2AC6GA5D | 2026-06-02 20:17:54 | Customer Transfer to - 07*******291 EUGENE OGUTU | Completed | | -300.00 | 1,699.57"
→ { date: "2026-06-02", description: "Customer Transfer to - 07*******291 EUGENE OGUTU", amount: 300, type: "expense", currency: "KES", reference: "UF2AC6GA5D", balance: 1699.57, payment_method: "mpesa" }
(NOTE: Withdrawn shows -300.00 → amount is 300 positive, type is "expense")

Row: "UF2AC6GFDN | 2026-06-02 20:15:50 | Business Payment from 859551 - MALI. via API. Original conversation ID is TR-UTSA/MALI/0009864734. | Completed | 1,500.00 | | 4,032.57"
→ { date: "2026-06-02", description: "Business Payment from 859551 - MALI. via API", amount: 1500, type: "income", currency: "KES", reference: "UF2AC6GFDN", balance: 4032.57, payment_method: "mpesa" }

Row: "UF2AC6GA5D | 2026-06-02 20:17:54 | Customer Transfer of Funds Charge | Completed | | -7.00 | 1,692.57"
→ { date: "2026-06-02", description: "Customer Transfer of Funds Charge", amount: 7, type: "expense", currency: "KES", reference: "UF2AC6GA5D", balance: 1692.57, payment_method: "mpesa" }
(M-Pesa transaction fees ARE real transactions — do NOT skip them)

UAE Bank (Emirates NBD / FAB / ADCB) — columns: Date | Details | Debit (مدين) | Credit (دائن) | Balance
Row: "09/06/2026 | CARD NO.443913XXXXXX4326 talabat.com DUBAI:AE 782004 05-06-2026 35.24,AED | 35.24 | | 1,250.00"
→ { date: "2026-06-09", description: "CARD NO.443913XXXXXX4326 talabat.com DUBAI:AE 782004", amount: 35.24, type: "expense", currency: "AED", reference: null, balance: 1250 }

Row: "08/06/2026 | REV RMA 202606080006B98111608748362 AE76050000000000018871411 PI039 Payment timeout - awaiting the respo | | 61.51 | 1,311.51"
→ { date: "2026-06-08", description: "REV RMA 202606080006B98111608748362 Payment timeout reversal", amount: 61.51, type: "income", currency: "AED", reference: "202606080006B98111608748362", balance: 1311.51 }
(NOTE: the Credit column has the value, so type is "income" even though description says "REV")

ROWS TO SKIP:
"01/01/2025 | Opening Balance | | | 32,230.00" → SKIP
"TOTAL DEBITS | | 45,600.00 | |" → SKIP
"Closing Balance as at 31/01/2025 | 58,900.00" → SKIP
"Balance Brought Forward | | | 5,000.00" → SKIP
"رصيد مرحل | | | 5,000.00" → SKIP (Arabic "brought forward")
Any row with no date → SKIP
Any row where the description is only a date range or summary label → SKIP`;

const CHAIN_OF_THOUGHT = `
EXTRACTION APPROACH — follow these steps:
1. Scan the entire document and count the total number of transaction rows (rows with a date AND a debit or credit amount). Note this count.
2. Identify the column structure: are amounts in a single "Amount" column or split into "Debit"/"Credit" columns?
3. For each row in the transaction table:
   a. Is it a transaction row (has a date AND amount)? → Extract it
   b. Is it a header, opening balance, closing balance, or subtotal? → Skip it
4. Verify your output array length matches the count from step 1`;

const VALIDATION = `
BEFORE RETURNING:
- Your output transactions array must contain every transaction row — no omissions
- All amounts must be positive numbers
- All dates must be in YYYY-MM-DD format
- Every row must have type "income" or "expense"`;

export function buildPrompt(orgName: string | null, useChainOfThought: boolean): string {
  const parts = [BASE, FIELD_RULES, EXAMPLES];

  if (orgName) {
    parts.push(
      `\nCONTEXT: The account holder is "${orgName}". Transactions where money is received by "${orgName}" are type "income". Transactions where "${orgName}" pays are type "expense".`,
    );
  }

  if (useChainOfThought) {
    parts.push(`\n${CHAIN_OF_THOUGHT}`);
  }

  parts.push(`\n${VALIDATION}`);

  return parts.join("\n");
}
