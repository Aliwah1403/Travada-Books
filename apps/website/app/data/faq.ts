import { PRICING_PUBLISHED } from "~/data/pricing"
import { CONTACT_EMAIL } from "~/data/site"

export type FaqItem = {
  id: string
  question: string
  answer: string
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "what-is-it",
    question: "What is Travada Books?",
    answer:
      "Invoicing and bookkeeping software for freelancers and small businesses in Kenya. Send invoices and quotes, import your bank and M-Pesa statements, and keep receipts organised in one place.",
  },
  {
    id: "who-is-it-for",
    question: "Who is it for?",
    answer:
      "Freelancers, consultants on retainers, agencies, and small business owners who would rather run their business than their paperwork.",
  },
  {
    id: "accounting-knowledge",
    question: "Do I need accounting knowledge?",
    answer:
      "No. Travada Books is built for business owners, not accountants. If you can send an invoice, you can use it.",
  },
  {
    id: "how-records-get-in",
    question: "How do my bank and M-Pesa records get in?",
    answer:
      "Upload the statement your bank or M-Pesa gave you, as a CSV or a PDF. Travada Books reads the columns, including statements that split money in and money out, and categorises the transactions for you.",
  },
  {
    id: "currencies",
    question: "Can I invoice in other currencies?",
    answer:
      "Yes. Bill a client in pounds, dollars or euros and still see your own totals in shillings.",
  },
  {
    id: "cost",
    question: "What does it cost?",
    answer: PRICING_PUBLISHED
      ? "See our pricing page."
      : "Travada Books is free while we're in beta.",
  },
  {
    id: "contact",
    question: "How do I get in touch?",
    answer: `Email us at ${CONTACT_EMAIL}.`,
  },
]

// ⚠️ No "M-Pesa" anywhere in this list — see WEBSITE-PLAN.md §5 rule 4 and
// CLAUDE.md's voice rules. This FAQ set renders only on /invoicing.
export const INVOICING_FAQ_ITEMS: FaqItem[] = [
  {
    id: "recurring-frequencies",
    question: "How does a recurring invoice actually work?",
    answer:
      "Set it up once with a frequency — weekly, every two weeks, monthly, quarterly or yearly — and an end condition: on a date, after a set number of invoices, or ongoing until you stop it. You'll see the next three send dates before you commit to anything.",
  },
  {
    id: "reminders",
    question: "Do reminders go out on their own?",
    answer:
      "Yes. Choose how many days after the due date — 3, 5, 7 or 10 — and once an unpaid invoice reaches that point, Travada Books emails the customer for you. You don't send it yourself, and overdue invoices mark themselves overdue automatically either way.",
  },
  {
    id: "quotes-no-signup",
    question: "Does a customer need an account to accept a quote?",
    answer:
      "No. They open the quote with a link and accept it — no app, no signup. It's turned into a draft invoice for you, and you retype nothing.",
  },
  {
    id: "part-payments",
    question: "What if a customer only pays part of an invoice?",
    answer:
      "Record the payment as it arrives, even if it's less than the full amount. The invoice shows partially paid with the remaining balance, and you can record further payments as they come in.",
  },
  {
    id: "invoice-currency",
    question: "Can I invoice a client in another currency?",
    answer:
      "Yes. Bill a client in pounds, dollars or euros and still see your own totals converted to shillings.",
  },
]

export const STATEMENT_IMPORT_FAQ_ITEMS: FaqItem[] = [
  {
    id: "which-banks",
    question: "Which banks does this work with?",
    answer:
      "Any of them. Travada Books doesn't partner with specific banks — it reads whatever CSV or PDF statement your bank or M-Pesa gives you and works out the columns itself, including statements that split money in and money out into separate debit and credit columns.",
  },
  {
    id: "file-types",
    question: "What file types can I upload?",
    answer: "CSV or PDF — whatever format your bank or M-Pesa exports.",
  },
  {
    id: "categorisation",
    question: "How accurate is the automatic categorising?",
    answer:
      "Transactions are categorised automatically as they arrive, matched against your own categories — it recognises things like M-Pesa transfers and common local merchants along the way. You can always recategorise anything that's wrong, individually or in bulk.",
  },
  {
    id: "bulk-actions",
    question: "Can I fix a batch of transactions at once?",
    answer:
      "Yes. Select as many as you like and set their category, status or payment method, mark them recurring, or delete them — all in one action instead of one at a time.",
  },
  {
    id: "export",
    question: "Can I get my transactions back out?",
    answer: "Export your transactions to CSV or Excel whenever you need to.",
  },
]

export const INBOX_FAQ_ITEMS: FaqItem[] = [
  {
    id: "which-providers",
    question: "Which email providers can I connect?",
    answer: "Gmail and Outlook.",
  },
  {
    id: "what-gets-read",
    question: "What does Travada Books actually read in my inbox?",
    answer:
      "Only PDF attachments on emails you didn't send yourself — nothing else is pulled in or stored, and access to your inbox is read-only. You can disconnect the account at any time.",
  },
  {
    id: "matching",
    question: "How does a receipt get matched to a transaction?",
    answer:
      "When Travada Books is confident it's found the right transaction, it matches automatically. Where it's less sure, it suggests a match for you to confirm — you're never guessing which one is right.",
  },
  {
    id: "where-do-receipts-go",
    question: "Where do my receipts end up?",
    answer:
      "In your Vault, attached to the transaction they belong to. Travada Books reads and titles each one automatically, so it's searchable later by name or by what's actually on the document.",
  },
  {
    id: "forwarding",
    question: "What if a receipt isn't in an inbox Travada Books can connect to?",
    answer:
      "Every organisation gets its own Travada inbox address. Forward the email there directly and it's picked up the same way as a connected account.",
  },
]
