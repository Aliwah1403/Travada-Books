// Breadcrumb trail for the top bar. Pure: built from the pathname, the
// search string, the names of any records on the page, and where the user
// came from (so an invoice opened from a customer reads
// "Customers › Acme Ltd › INV-011" instead of "Invoices › INV-011").

export type Crumb = { label: string; href?: string }

/** Names of the records in the current URL, filled in as their queries load. */
export type CrumbRecords = {
  invoice?: string | null
  quote?: string | null
  customer?: string | null
  statementCustomer?: { id: string; name: string } | null
}

/** A customer page the user arrived from, for record pages that belong to one. */
export type CrumbOrigin = { customerId: string; customerName?: string | null }

const SECTION_LABELS: Record<string, string> = {
  insights: "Insights",
  invoices: "Invoices",
  quotes: "Quotes",
  customers: "Customers",
  transactions: "Transactions",
  vault: "Vault",
  inbox: "Inbox",
  bills: "Bills",
  statements: "Statements",
  settings: "Settings",
  account: "Account",
}

const SUB_LABELS: Record<string, string> = {
  general: "General",
  team: "Team",
  integrations: "Integrations",
  gmail: "Gmail",
  outlook: "Outlook",
  paystack: "Paystack",
  billing: "Billing",
  categories: "Categories",
  inbox: "Inbox",
  profile: "Profile",
  security: "Security",
  notifications: "Notifications",
}

/** Placeholder while a record's name is still loading — keeps the trail's shape stable. */
export const LOADING_LABEL = "…"

const name = (value: string | null | undefined) => (value === undefined ? LOADING_LABEL : value || "Untitled")

export function buildBreadcrumbs(
  pathname: string,
  search: string,
  records: CrumbRecords = {},
  origin?: CrumbOrigin | null,
): Crumb[] {
  const parts = pathname.split("/").filter(Boolean)
  const params = new URLSearchParams(search)

  // Dashboard: the tab is a real place, so show it once you leave the default.
  if (parts.length === 0) {
    return params.get("tab") === "metrics"
      ? [{ label: "Dashboard", href: "/" }, { label: "Metrics" }]
      : [{ label: "Dashboard" }]
  }

  const [section, id, action] = parts
  const sectionLabel = SECTION_LABELS[section!] ?? "Travada Books"
  const sectionHref = `/${section}`

  // Settings / Account: nested pages ("Settings › Integrations › Gmail").
  if (section === "settings" || section === "account") {
    const crumbs: Crumb[] = [{ label: sectionLabel, href: sectionHref }]
    let href = sectionHref
    parts.slice(1).forEach((part) => {
      href += `/${part}`
      crumbs.push({ label: SUB_LABELS[part] ?? part, href })
    })
    return withCurrent(crumbs)
  }

  if (section === "inbox" && id === "oauth-complete") {
    return [{ label: "Inbox", href: "/inbox" }, { label: "Connecting…" }]
  }

  // Documents that belong to a customer: invoices and quotes.
  if ((section === "invoices" || section === "quotes") && id) {
    const docLabel = section === "invoices" ? "invoice" : "quote"
    if (id === "create") {
      const fromCustomer = params.get("customerId")
      return fromCustomer && origin?.customerId === fromCustomer
        ? [
            { label: "Customers", href: "/customers" },
            { label: name(origin.customerName), href: `/customers/${fromCustomer}` },
            { label: `New ${docLabel}` },
          ]
        : [{ label: sectionLabel, href: sectionHref }, { label: `New ${docLabel}` }]
    }
    const recordName = name(section === "invoices" ? records.invoice : records.quote)
    const base: Crumb[] = origin
      ? [
          { label: "Customers", href: "/customers" },
          { label: name(origin.customerName), href: `/customers/${origin.customerId}` },
        ]
      : [{ label: sectionLabel, href: sectionHref }]
    const record: Crumb = { label: recordName, href: `${sectionHref}/${id}` }
    return withCurrent(action === "edit" ? [...base, record, { label: "Edit" }] : [...base, record])
  }

  if (section === "customers" && id) {
    return [{ label: "Customers", href: "/customers" }, { label: name(records.customer) }]
  }

  // Statements are always for one customer, so they live under that customer.
  if (section === "statements" && id) {
    const c = records.statementCustomer
    return c === undefined
      ? [{ label: "Customers", href: "/customers" }, { label: LOADING_LABEL }, { label: "Statement" }]
      : c
        ? [
            { label: "Customers", href: "/customers" },
            { label: c.name || "Untitled", href: `/customers/${c.id}` },
            { label: "Statement" },
          ]
        : [{ label: "Statement" }]
  }

  return [{ label: sectionLabel }]
}

/** The last crumb is the current page — never a link. */
function withCurrent(crumbs: Crumb[]): Crumb[] {
  return crumbs.map((c, i) => (i === crumbs.length - 1 ? { label: c.label } : c))
}

/** What the record crumbs need fetched for this path (ids by kind). */
export function crumbRecordIds(pathname: string): {
  invoiceId?: string
  quoteId?: string
  customerId?: string
  statementId?: string
} {
  const [section, id] = pathname.split("/").filter(Boolean)
  if (!id || id === "create" || id === "oauth-complete") return {}
  if (section === "invoices") return { invoiceId: id }
  if (section === "quotes") return { quoteId: id }
  if (section === "customers") return { customerId: id }
  if (section === "statements") return { statementId: id }
  return {}
}
