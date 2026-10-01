// Help centre information architecture for /guides (routes/guides._index.tsx).
//
// Categories, and the order and search keywords of every guide. Only guides
// that exist (content/guides/<slug>.mdx, not a draft) are shown — there are
// no "Coming soon" placeholders. A guide's title and summary always come
// from its MDX frontmatter; an entry here only sets its position, keywords
// and whether it's popular. A guide missing from this list still appears,
// at the end of the category its frontmatter names.
//
// Voice rules (WEBSITE-PLAN.md §5): no M-Pesa in invoicing, quotes or
// customers titles/summaries/keywords; nothing on the roadmap (eTIMS
// invoicing, collecting payments by M-Pesa) gets a how-to here.

import {
  BankIcon,
  DashboardSquare01Icon,
  Globe02Icon,
  InboxIcon,
  Invoice01Icon,
  QuoteIcon,
  Settings02Icon,
  TargetIcon,
  User02Icon,
  Wallet01Icon,
  type Icon,
} from "@travada-books/ui/icons"

import type { FrontmatterEntry } from "~/lib/content"

export const HELP_CATEGORY_IDS = [
  "getting-started",
  "invoicing",
  "quotes",
  "customers",
  "payments",
  "transactions",
  "inbox",
  "dashboard",
  "settings",
  "kenya",
] as const

export type HelpCategoryId = (typeof HELP_CATEGORY_IDS)[number]

export function isHelpCategoryId(value: unknown): value is HelpCategoryId {
  return typeof value === "string" && (HELP_CATEGORY_IDS as readonly string[]).includes(value)
}

// Invoicing-side categories: their pages never show M-Pesa content beside
// them (WEBSITE-PLAN.md §5), e.g. in the "More guides" block.
export const MPESA_FREE_CATEGORIES: readonly HelpCategoryId[] = ["getting-started", "invoicing", "quotes", "customers"]

export function mentionsMpesa(text: string): boolean {
  return /m-?pesa/i.test(text)
}

export type HelpCategory = {
  id: HelpCategoryId
  title: string
  description: string
  icon: Icon
  /** Long-form reading rather than task help — shown with summary + read time. */
  longform?: boolean
}

// Array order is display order.
export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: "getting-started",
    title: "Getting started",
    description: "Set up your business and send your first invoice.",
    icon: TargetIcon,
  },
  {
    id: "invoicing",
    title: "Invoicing",
    description: "Create, send, schedule and follow up on invoices.",
    icon: Invoice01Icon,
  },
  {
    id: "quotes",
    title: "Quotes",
    description: "Send quotes customers can accept online.",
    icon: QuoteIcon,
  },
  {
    id: "customers",
    title: "Customers",
    description: "Customer details and statements of account.",
    icon: User02Icon,
  },
  {
    id: "payments",
    title: "Payments",
    description: "Record full and part payments so balances stay right.",
    icon: Wallet01Icon,
  },
  {
    id: "transactions",
    title: "Transactions & statement import",
    description: "Bring in bank and mobile money statements, then categorise them.",
    icon: BankIcon,
  },
  {
    id: "inbox",
    title: "Inbox & Vault",
    description: "Collect receipts, match them and keep your documents.",
    icon: InboxIcon,
  },
  {
    id: "dashboard",
    title: "Dashboard",
    description: "Read your numbers and arrange the widgets you need.",
    icon: DashboardSquare01Icon,
  },
  {
    id: "settings",
    title: "Account & team",
    description: "Invite your team, choose notifications, and export or delete your data.",
    icon: Settings02Icon,
  },
  {
    id: "kenya",
    title: "Kenya business guides",
    description: "Longer reads on eTIMS, record-keeping and running a business in Kenya.",
    icon: Globe02Icon,
    longform: true,
  },
]

export type GuideEntry = {
  slug: string
  /** Fallback only — the guide's frontmatter category wins. */
  category: HelpCategoryId
  /** Extra words people might search for. */
  keywords?: string[]
  /** Listed under "Popular articles". */
  popular?: boolean
}

// Array order is the order within each category.
export const HELP_ARTICLES: GuideEntry[] = [
  // Getting started
  { slug: "quick-start", category: "getting-started", keywords: ["sign up", "signup", "onboarding", "new account", "begin", "setup", "first invoice"], popular: true },
  { slug: "set-up-your-business", category: "getting-started", keywords: ["business profile", "company details", "logo", "address", "tax number", "currency", "settings"] },
  // Invoicing
  { slug: "create-and-send-an-invoice", category: "invoicing", keywords: ["new invoice", "bill", "send", "email", "schedule", "draft", "pdf"], popular: true },
  { slug: "set-up-a-recurring-invoice", category: "invoicing", keywords: ["recurring", "repeat", "monthly", "retainer", "subscription", "automatic"], popular: true },
  { slug: "reminders-and-overdue-invoices", category: "invoicing", keywords: ["reminder", "overdue", "late", "chase", "follow up", "unpaid"] },
  { slug: "invoice-settings-and-custom-fields", category: "invoicing", keywords: ["settings", "template", "numbering", "tax", "vat", "discount", "custom field", "defaults", "attach pdf"] },
  { slug: "track-invoice-status", category: "invoicing", keywords: ["status", "draft", "sent", "paid", "part-paid", "overdue", "activity", "delivered", "link"] },
  // Quotes
  { slug: "create-and-send-a-quote", category: "quotes", keywords: ["quote", "quotation", "estimate", "proposal", "valid until", "send"] },
  { slug: "quote-responses-and-invoices", category: "quotes", keywords: ["accept", "decline", "accepted", "declined", "convert", "quote to invoice", "draft invoice"] },
  // Customers
  { slug: "add-and-manage-customers", category: "customers", keywords: ["customer", "client", "contact", "add customer", "edit customer", "delete customer"] },
  { slug: "send-a-customer-statement", category: "customers", keywords: ["statement", "statement of account", "balance", "ledger", "owed"] },
  // Payments
  { slug: "record-a-payment", category: "payments", keywords: ["payment", "paid", "part payment", "partial", "deposit", "balance", "mark as paid", "overpayment"], popular: true },
  // Transactions
  { slug: "import-a-bank-or-mpesa-statement", category: "transactions", keywords: ["import", "upload", "bank statement", "mobile money", "mpesa", "csv", "pdf"], popular: true },
  { slug: "categorise-transactions", category: "transactions", keywords: ["category", "categories", "categorise", "categorize", "bulk", "analyzing", "sort"] },
  { slug: "add-transactions-and-attach-receipts", category: "transactions", keywords: ["add transaction", "manual", "expense", "receipt", "attachment", "document"] },
  { slug: "export-transactions", category: "transactions", keywords: ["export", "download", "csv", "excel", "accountant", "spreadsheet"] },
  // Inbox & Vault
  { slug: "connect-gmail-or-outlook", category: "inbox", keywords: ["gmail", "outlook", "email", "connect", "inbox", "receipts", "google", "microsoft"], popular: true },
  { slug: "forward-receipts-to-your-inbox", category: "inbox", keywords: ["forward", "forwarding address", "email receipts", "inbox address"] },
  { slug: "match-receipts-to-transactions", category: "inbox", keywords: ["match", "matching", "suggested match", "receipt", "reconcile"] },
  { slug: "store-files-in-the-vault", category: "inbox", keywords: ["vault", "files", "documents", "folders", "upload", "share", "storage"] },
  // Dashboard
  { slug: "your-dashboard-and-metrics", category: "dashboard", keywords: ["dashboard", "metrics", "revenue", "profit", "expenses", "cash flow", "widgets", "burn", "runway"] },
  // Account & team
  { slug: "invite-your-team", category: "settings", keywords: ["team", "invite", "member", "role", "admin", "staff", "remove member"] },
  { slug: "notification-settings", category: "settings", keywords: ["notifications", "email notifications", "alerts", "preferences"] },
  { slug: "export-or-delete-your-data", category: "settings", keywords: ["export", "download all data", "delete organisation", "delete account", "close account", "backup"] },
  // Kenya business guides
  {
    slug: "etims-for-small-businesses-kenya",
    category: "kenya",
    keywords: ["etims", "kra", "tax invoice", "tax", "compliance"],
  },
  {
    slug: "how-to-organise-mpesa-statements-for-bookkeeping",
    category: "kenya",
    keywords: ["mpesa", "statement", "bookkeeping", "reconcile", "safaricom"],
  },
  {
    slug: "recurring-invoices-for-small-businesses-kenya",
    category: "kenya",
    keywords: ["recurring", "retainer", "subscription", "invoice"],
  },
]

export type HelpArticle = GuideEntry & {
  title: string
  summary: string
  /** Minutes, from the MDX frontmatter. */
  readingTime?: number
  /** Frontmatter tag. */
  tag?: string
}

export type HelpCategoryWithArticles = HelpCategory & {
  articles: HelpArticle[]
}

/**
 * The help centre as it stands: every published guide, ordered by
 * HELP_ARTICLES, grouped into categories. Title and summary come from each
 * guide's frontmatter. Entries without a guide are skipped, guides without
 * an entry go last in their category, and empty categories are dropped.
 */
export function buildHelpCentre(guides: FrontmatterEntry[]): HelpCategoryWithArticles[] {
  const order = new Map(HELP_ARTICLES.map((entry, index) => [entry.slug, index]))
  const entries = new Map(HELP_ARTICLES.map((entry) => [entry.slug, entry]))

  const articles: HelpArticle[] = guides
    .map((guide) => {
      const entry = entries.get(guide.slug)
      return {
        slug: guide.slug,
        category: guide.frontmatter.category ?? entry?.category ?? "getting-started",
        keywords: entry?.keywords,
        popular: entry?.popular,
        title: guide.frontmatter.title,
        summary: guide.frontmatter.summary,
        readingTime: guide.frontmatter.readingTime,
        tag: guide.frontmatter.tag,
      }
    })
    .sort((a, b) => (order.get(a.slug) ?? Infinity) - (order.get(b.slug) ?? Infinity))

  return HELP_CATEGORIES.map((category) => ({
    ...category,
    articles: articles.filter((article) => article.category === category.id),
  })).filter((category) => category.articles.length > 0)
}
