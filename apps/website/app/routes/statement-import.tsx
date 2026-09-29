import {
  BankIcon,
  Download01Icon,
  FileSpreadsheetIcon,
  ListViewIcon,
  SparklesIcon,
  Tag01Icon,
  Upload01Icon,
  ReceiptTextIcon,
} from "@travada-books/ui/icons"

import { FeaturePage, type FeaturePageContent } from "~/components/feature/feature-page"
import { StatementImportHeroMockup } from "~/components/feature/mockups/statement-import/import-hero"
import { AutoCategorizeMockup } from "~/components/feature/mockups/statement-import/auto-categorize"
import { BulkActionsMockup } from "~/components/feature/mockups/statement-import/bulk-actions"
import { ColumnMappingMockup } from "~/components/feature/mockups/statement-import/column-mapping"
import { STATEMENT_IMPORT_FAQ_ITEMS } from "~/data/faq"
import { faqPageJsonLd, pageMeta } from "~/lib/seo"

// eslint-disable-next-line react-refresh/only-export-components -- route module convention: meta + default component
export function meta() {
  return [
    ...pageMeta({
      title: "Statement import — Travada Books",
      description:
        "Upload a bank or M-Pesa statement — CSV or PDF, from any bank — and Travada Books reads the columns, splits debit and credit, and sorts every transaction.",
      path: "/statement-import",
      image: "/og/statement-import.png",
    }),
    faqPageJsonLd(STATEMENT_IMPORT_FAQ_ITEMS),
  ]
}

const CONTENT: FeaturePageContent = {
  eyebrow: { label: "Statement import", icon: BankIcon },
  title: "A year of records, sorted in one upload.",
  lede: "Bring in your bank statement or your M-Pesa records — a CSV, or a PDF, whatever you've got. It reads the file, works out the columns itself, and sorts every transaction so you don't have to.",
  heroLayout: "split-shot",
  visual: <StatementImportHeroMockup />,
  rows: [
    {
      label: "Import",
      icon: Upload01Icon,
      title: "Any file, any bank",
      body: "Upload your bank statement or your M-Pesa records — a CSV, or a PDF, whatever your bank gave you. Travada Books works out which column is the date, which is the amount, and which is money in and money out — including statements that split debit and credit into two separate columns, because plenty of them do.",
      visual: <ColumnMappingMockup />,
    },
    {
      label: "Categories",
      icon: Tag01Icon,
      title: "They sort themselves",
      body: "Transactions are categorised automatically as they come in, against your own categories — it recognises things like M-Pesa transfers and common local merchants along the way. Anything it gets wrong, you fix once and move on.",
      visual: <AutoCategorizeMockup />,
    },
    {
      label: "Bulk actions",
      icon: ListViewIcon,
      title: "One action, not a hundred",
      body: "Need to mark a hundred transactions as paid by M-Pesa, set their category, or mark them recurring? Select as many as you like and do it once — individually is still there for the one-off exception.",
      visual: <BulkActionsMockup />,
    },
  ],
  details: [
    {
      title: "CSV or PDF",
      body: "Whatever format your bank or M-Pesa exports. No partner bank needed.",
      icon: FileSpreadsheetIcon,
    },
    {
      title: "Split columns handled",
      body: "Statements with separate debit and credit columns are read correctly.",
      icon: SparklesIcon,
    },
    {
      title: "Get it back out",
      body: "Export whatever you've selected to CSV or Excel, for your accountant or for KRA.",
      icon: Download01Icon,
    },
    {
      title: "Receipts attach",
      body: "Receipts from your Inbox are matched to the transactions they belong to.",
      icon: ReceiptTextIcon,
    },
  ],
  faq: { title: "Statement import questions", items: STATEMENT_IMPORT_FAQ_ITEMS },
}

export default function StatementImport() {
  return <FeaturePage content={CONTENT} />
}
