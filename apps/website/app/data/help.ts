// Help centre information architecture for /guides (routes/guides._index.tsx).
//
// Categories and the full planned article list live here. An article counts
// as written when content/guides/<slug>.mdx exists (and isn't a draft) —
// that is derived from the MDX frontmatter at build time by
// buildHelpCentre(), never flagged by hand. Everything else shows as
// "Coming soon": visible, searchable, never linked.
//
// Voice rules (WEBSITE-PLAN.md §5): no M-Pesa in invoicing, quotes or
// portal titles/summaries/keywords; nothing on the roadmap (eTIMS
// invoicing, collecting payments by M-Pesa) gets a how-to here.
//
// COPY: needs Curtis's approval (category descriptions, planned titles and summaries)

import {
  BankIcon,
  DashboardSquare01Icon,
  Download01Icon,
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
  "data",
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
    title: "Customers & portal",
    description: "Customer details, statements and a shared portal link.",
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
    description: "Bring in bank and M-Pesa statements, then categorise them.",
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
    title: "Settings & team",
    description: "Invite teammates, choose notifications, secure your account.",
    icon: Settings02Icon,
  },
  {
    id: "data",
    title: "Your data",
    description: "Export everything, or delete an organisation or account.",
    icon: Download01Icon,
  },
  {
    id: "kenya",
    title: "Kenya business guides",
    description: "Longer reads on eTIMS, record-keeping and running a business in Kenya.",
    icon: Globe02Icon,
    longform: true,
  },
]

export type PlannedArticle = {
  slug: string
  title: string
  summary: string
  category: HelpCategoryId
  /** Extra words people might search for. */
  keywords?: string[]
  /** Listed under "Popular articles" once written. */
  popular?: boolean
}

// Array order is the order within each category.
export const HELP_ARTICLES: PlannedArticle[] = [
  // Getting started
  {
    slug: "quick-start",
    title: "Quick start: set up and send your first invoice",
    summary: "Create your account, set up your business and get your first invoice out.",
    category: "getting-started",
    keywords: ["sign up", "signup", "onboarding", "new account", "begin", "setup", "first invoice"],
    popular: true,
  },
  {
    slug: "tour-of-travada-books",
    title: "A tour of Travada Books",
    summary: "What each part of the sidebar does and where to find things.",
    category: "getting-started",
    keywords: ["overview", "navigation", "sidebar", "introduction"],
  },
  {
    slug: "set-up-your-business-profile",
    title: "Set up your business profile",
    summary: "Your business name, logo, tax number, address and base currency.",
    category: "getting-started",
    keywords: ["logo", "kra pin", "tax id", "vat number", "address", "currency", "organisation", "company"],
  },

  // Invoicing
  {
    slug: "create-and-send-an-invoice",
    title: "Create and send an invoice",
    summary: "Add a customer and line items, then email it, share a link or download the PDF.",
    category: "invoicing",
    keywords: ["new invoice", "bill", "billing", "email invoice", "whatsapp", "pdf", "link", "line items", "tax", "vat", "discount"],
    popular: true,
  },
  {
    slug: "set-up-a-recurring-invoice",
    title: "Set up a recurring invoice",
    summary: "Bill a retainer or subscription on a schedule and let it send itself.",
    category: "invoicing",
    keywords: ["repeat", "repeating", "monthly", "weekly", "retainer", "subscription", "schedule", "automatic"],
    popular: true,
  },
  {
    slug: "schedule-an-invoice",
    title: "Schedule an invoice to send later",
    summary: "Pick a date and time, and the invoice goes out on its own.",
    category: "invoicing",
    keywords: ["schedule send", "later", "future date", "timed"],
  },
  {
    slug: "send-payment-reminders",
    title: "Send payment reminders",
    summary: "Turn on automatic reminders after the due date, or send one yourself.",
    category: "invoicing",
    keywords: ["reminder", "overdue", "late", "follow up", "chase", "auto reminders"],
  },
  {
    slug: "invoice-settings",
    title: "Customise your invoice settings",
    summary: "Logo, numbering, payment terms, columns and the default note on every invoice.",
    category: "invoicing",
    keywords: ["template", "numbering", "prefix", "payment terms", "due date", "date format", "columns", "default note", "payment details"],
  },
  {
    slug: "add-custom-fields",
    title: "Add custom fields to invoices and quotes",
    summary: "Show extra details such as a PO number or project name on your documents.",
    category: "invoicing",
    keywords: ["custom field", "po number", "purchase order", "project", "reference", "extra fields"],
  },
  {
    slug: "invoice-statuses",
    title: "What each invoice status means",
    summary: "Draft, Scheduled, Sent, Part-paid, Paid, Overdue and Canceled explained.",
    category: "invoicing",
    keywords: ["status", "draft", "scheduled", "sent", "part-paid", "partially paid", "paid", "overdue", "canceled"],
  },

  // Quotes
  {
    slug: "create-and-send-a-quote",
    title: "Create and send a quote",
    summary: "Price up the work, set a valid-until date and share it with your customer.",
    category: "quotes",
    keywords: ["quotation", "estimate", "proposal", "new quote", "valid until"],
  },
  {
    slug: "accepting-and-declining-quotes",
    title: "How customers accept or decline a quote",
    summary: "What your customer sees on the quote link, and how you're told.",
    category: "quotes",
    keywords: ["accept", "decline", "approve", "reject", "expired", "quote link"],
  },
  {
    slug: "quote-to-invoice",
    title: "Turn an accepted quote into an invoice",
    summary: "An accepted quote becomes an invoice without retyping the work.",
    category: "quotes",
    keywords: ["convert", "conversion", "accepted quote", "invoice from quote"],
  },

  // Customers & portal
  {
    slug: "add-a-customer",
    title: "Add and edit customers",
    summary: "Save a customer's details once and reuse them on every document.",
    category: "customers",
    keywords: ["new customer", "client", "contact", "billing email", "edit customer"],
  },
  {
    slug: "send-a-customer-statement",
    title: "Send a customer statement",
    summary: "Show a customer every invoice in a date range, with what's paid and what's owed.",
    category: "customers",
    keywords: ["statement of account", "balance", "owed", "outstanding", "date range"],
  },
  {
    slug: "share-a-customer-portal",
    title: "Share a customer portal link",
    summary: "Give a customer one link to all their invoices, quotes and statements.",
    category: "customers",
    keywords: ["portal", "customer link", "self service", "all invoices", "share"],
  },

  // Payments
  {
    slug: "record-a-payment",
    title: "Record a payment (full or part)",
    summary: "Log money received against an invoice, and the balance and status update for you.",
    category: "payments",
    keywords: ["payment", "paid", "mark as paid", "partial payment", "part payment", "part-paid", "deposit", "installment", "balance due"],
    popular: true,
  },
  {
    slug: "handle-an-overpayment",
    title: "Handle an overpayment",
    summary: "What happens when a customer pays more than the balance due.",
    category: "payments",
    keywords: ["overpaid", "overpayment", "too much", "refund", "credit"],
  },
  {
    slug: "delete-a-payment",
    title: "Correct or delete a payment",
    summary: "Remove a payment recorded by mistake and put the balance back.",
    category: "payments",
    keywords: ["undo payment", "wrong payment", "mistake", "remove payment"],
  },

  // Transactions & statement import
  {
    slug: "import-a-bank-or-mpesa-statement",
    title: "Import a bank or M-Pesa statement",
    summary: "Upload a PDF or CSV statement and let Travada Books read the transactions for you.",
    category: "transactions",
    keywords: ["import", "upload", "csv", "pdf", "bank statement", "mpesa statement", "safaricom", "column mapping"],
    popular: true,
  },
  {
    slug: "add-a-transaction",
    title: "Add a transaction by hand",
    summary: "Record cash income or an expense that isn't on a statement.",
    category: "transactions",
    keywords: ["new transaction", "manual", "cash", "expense", "income"],
  },
  {
    slug: "categorise-transactions",
    title: "Categorise transactions",
    summary: "Sort money in and out into categories, one at a time or in bulk.",
    category: "transactions",
    keywords: ["category", "categories", "categorize", "bulk edit", "sort", "tag", "expense categories"],
  },
  {
    slug: "attach-a-receipt",
    title: "Attach a receipt to a transaction",
    summary: "Keep the proof beside the transaction it belongs to.",
    category: "transactions",
    keywords: ["receipt", "attachment", "proof", "upload receipt", "invoice attachment"],
  },
  {
    slug: "export-transactions",
    title: "Export transactions",
    summary: "Download your transactions for your accountant or your own records.",
    category: "transactions",
    keywords: ["export", "download", "csv", "spreadsheet", "excel", "accountant"],
  },

  // Inbox & Vault
  {
    slug: "connect-gmail-or-outlook",
    title: "Connect Gmail or Outlook to your Inbox",
    summary: "Pull receipts and supplier invoices in from the mailbox you already use.",
    category: "inbox",
    keywords: ["gmail", "google", "outlook", "microsoft", "email", "mailbox", "sync", "integration", "receipts"],
    popular: true,
  },
  {
    slug: "forward-receipts-to-your-inbox",
    title: "Forward receipts to your inbox address",
    summary: "Every organisation gets its own address. Forward receipts to it from anywhere.",
    category: "inbox",
    keywords: ["forward", "inbox email", "email address", "receipts", "send receipts"],
  },
  {
    slug: "confirm-suggested-matches",
    title: "Review and confirm suggested matches",
    summary: "Check the receipt Travada Books paired with a transaction, then confirm or decline it.",
    category: "inbox",
    keywords: ["match", "matching", "suggested match", "confirm", "decline", "reconcile"],
  },
  {
    slug: "block-a-sender",
    title: "Block a sender or domain",
    summary: "Stop newsletters and noise from landing in your Inbox.",
    category: "inbox",
    keywords: ["block", "blocklist", "spam", "sender", "domain", "unwanted"],
  },
  {
    slug: "store-files-in-the-vault",
    title: "Store and share files in the Vault",
    summary: "Keep contracts and documents in folders, and share a file by link.",
    category: "inbox",
    keywords: ["vault", "files", "documents", "folders", "storage", "share link", "upload"],
  },

  // Dashboard
  {
    slug: "customise-your-dashboard",
    title: "Customise your dashboard",
    summary: "Choose and arrange the widgets you want to see first.",
    category: "dashboard",
    keywords: ["widgets", "layout", "overview", "customize", "arrange"],
  },
  {
    slug: "understanding-your-metrics",
    title: "Understanding your metrics",
    summary: "How revenue, cash flow, burn rate and profit are worked out.",
    category: "dashboard",
    keywords: ["metrics", "revenue", "cash flow", "burn rate", "profit", "loss", "cash cushion", "charts", "reports", "opening balance"],
  },

  // Settings & team
  {
    slug: "invite-a-teammate",
    title: "Invite a teammate",
    summary: "Send an invite so a colleague or your accountant can work in your books.",
    category: "settings",
    keywords: ["invite", "team", "member", "colleague", "accountant", "add user"],
  },
  {
    slug: "manage-team-roles",
    title: "Change a member's role or remove them",
    summary: "Owners and members, and how to take someone off your team.",
    category: "settings",
    keywords: ["role", "owner", "member", "permissions", "remove member"],
  },
  {
    slug: "notification-settings",
    title: "Choose which notifications you get",
    summary: "Turn alerts on or off for invoices, quotes, your team and the Inbox.",
    category: "settings",
    keywords: ["notifications", "alerts", "emails", "in-app"],
  },
  {
    slug: "account-security",
    title: "Change your password and connected accounts",
    summary: "Update your password and manage how you sign in.",
    category: "settings",
    keywords: ["password", "security", "login", "sign in", "google sign in", "profile"],
  },

  // Your data
  {
    slug: "export-all-your-data",
    title: "Export all your data",
    summary: "Download everything in your organisation, whenever you want it.",
    category: "data",
    keywords: ["export", "download", "backup", "data", "archive"],
  },
  {
    slug: "delete-your-organisation",
    title: "Delete your organisation",
    summary: "What gets deleted, and how to keep a copy of your data first.",
    category: "data",
    keywords: ["delete", "remove", "close", "organisation", "organization", "business"],
  },
  {
    slug: "delete-your-account",
    title: "Delete your account",
    summary: "Close your personal account and what happens to your organisations.",
    category: "data",
    keywords: ["delete account", "close account", "remove account", "leave"],
  },

  // Kenya business guides — long-form SEO articles, all written
  {
    slug: "etims-for-small-businesses-kenya",
    title: "What Kenyan small businesses should know about eTIMS",
    summary: "A plain-language overview of eTIMS and who KRA says should use it.",
    category: "kenya",
    keywords: ["etims", "kra", "tax invoice", "tax", "compliance"],
  },
  {
    slug: "how-to-organise-mpesa-statements-for-bookkeeping",
    title: "How to organise M-Pesa statements for bookkeeping",
    summary: "Download, clean, categorise and reconcile M-Pesa transactions.",
    category: "kenya",
    keywords: ["mpesa", "statement", "bookkeeping", "reconcile", "safaricom"],
  },
  {
    slug: "recurring-invoices-for-small-businesses-kenya",
    title: "Recurring invoices for Kenyan small businesses",
    summary: "When to use recurring invoices and what to include on them.",
    category: "kenya",
    keywords: ["recurring", "retainer", "subscription", "invoice"],
  },
]

export type HelpArticle = PlannedArticle & {
  written: boolean
  /** Minutes, from the MDX frontmatter (written articles only). */
  readingTime?: number
  /** Frontmatter tag (written articles only). */
  tag?: string
}

export type HelpCategoryWithArticles = HelpCategory & {
  articles: HelpArticle[]
  writtenCount: number
  soonCount: number
}

/**
 * Merges the planned list with the guides that actually exist. A written
 * article takes its title and summary from its MDX frontmatter (the source
 * of truth once it exists); a guide with no planned entry is appended to
 * the category its frontmatter names, so nothing written is ever hidden.
 */
export function buildHelpCentre(guides: FrontmatterEntry[]): HelpCategoryWithArticles[] {
  const bySlug = new Map(guides.map((guide) => [guide.slug, guide]))
  const planned = new Set(HELP_ARTICLES.map((article) => article.slug))

  const articles: HelpArticle[] = HELP_ARTICLES.map((article) => {
    const guide = bySlug.get(article.slug)
    if (!guide) return { ...article, written: false }
    return {
      ...article,
      title: guide.frontmatter.title,
      summary: guide.frontmatter.summary,
      category: guide.frontmatter.category ?? article.category,
      written: true,
      readingTime: guide.frontmatter.readingTime,
      tag: guide.frontmatter.tag,
    }
  })

  for (const guide of guides) {
    if (planned.has(guide.slug) || !guide.frontmatter.category) continue
    articles.push({
      slug: guide.slug,
      title: guide.frontmatter.title,
      summary: guide.frontmatter.summary,
      category: guide.frontmatter.category,
      written: true,
      readingTime: guide.frontmatter.readingTime,
      tag: guide.frontmatter.tag,
    })
  }

  return HELP_CATEGORIES.map((category) => {
    const inCategory = articles.filter((article) => article.category === category.id)
    const writtenCount = inCategory.filter((article) => article.written).length
    return { ...category, articles: inCategory, writtenCount, soonCount: inCategory.length - writtenCount }
  })
}
