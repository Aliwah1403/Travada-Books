import { CtaBand } from "~/components/cta-band"
import { FeatureHero, FeatureRows, type FeatureRowItem } from "~/components/feature-page"
import { Faq } from "~/components/home/faq"
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

const ROWS: FeatureRowItem[] = [
  {
    title: "Any file, any bank",
    body: "Upload your bank statement or your M-Pesa records — a CSV, or a PDF, whatever your bank gave you. Travada Books works out which column is the date, which is the amount, and which is money in and money out — including statements that split debit and credit into two separate columns, because plenty of them do.",
    screenshotLabel: "CSV import mid-parse — column mapping detected automatically",
    visual: "import",
  },
  {
    title: "They sort themselves",
    body: "Transactions are categorised automatically as they come in, against your own categories — it recognises things like M-Pesa transfers and common local merchants along the way. Anything it gets wrong, you fix once and move on.",
    screenshotLabel: "Transaction list — categories applied automatically",
    visual: "categories",
  },
  {
    title: "One action, not a hundred",
    body: "Need to mark a hundred transactions as paid by M-Pesa, set their category, or mark them recurring? Select as many as you like and do it once — individually is still there for the one-off exception.",
    screenshotLabel: "Transaction list — multiple rows selected, bulk action toolbar open",
    visual: "bulk",
  },
  {
    title: "Get it back out",
    body: "Export whatever you've selected to CSV or Excel whenever you need to — for your accountant, for KRA, or just to keep your own copy.",
    screenshotLabel: "Export dialog — CSV or Excel format choice",
    visual: "export",
  },
]

export default function StatementImport() {
  return (
    <>
      <FeatureHero
        eyebrow="Statement import"
        title="A year of records, sorted in one upload."
        intro="Bring in your bank statement or your M-Pesa records — a CSV, or a PDF, whatever you've got. It reads the file, works out the columns itself, and sorts every transaction so you don't have to."
      />
      <FeatureRows items={ROWS} />
      <Faq items={STATEMENT_IMPORT_FAQ_ITEMS} heading="Statement import — frequently asked questions" />
      <CtaBand heading="Bring in your records. Today." />
    </>
  )
}
