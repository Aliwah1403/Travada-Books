import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useParams } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Alert01Icon,
  ArrowUpRight01Icon,
  ChevronRightIcon,
  Download01Icon,
  Invoice01Icon,
  MoreHorizontalIcon,
  QuoteIcon,
  ReceiptTextIcon,
} from "@travada-books/ui/icons"
import { Button } from "@travada-books/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@travada-books/ui/components/dropdown-menu"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@travada-books/ui/components/tabs"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@travada-books/ui/components/toggle-group"
import { cn } from "@travada-books/ui/lib/utils"
import { useTheme } from "@/components/theme-provider"
import { formatCurrency } from "@/lib/format"
import { ErrorState } from "@/components/shared/error-state"
import {
  InvoiceStatusBadge,
  type InvoiceStatus,
} from "@/components/invoices/invoice-status-badge"
import { InvoicePdf, buildInvoiceDocumentData } from "@travada-books/pdf"
import { downloadPdf } from "@/lib/pdf-download"
import { getInvoiceByToken } from "@/lib/queries/invoices"
import { parseCustomFields } from "@/lib/custom-fields"
import {
  getCustomerPortal,
  getCustomerPortalInvoices,
  getCustomerPortalQuotes,
  getCustomerPortalStatements,
  type CustomerPortalSummary,
  type CustomerPortalInvoice,
  type CustomerPortalQuote,
  type CustomerPortalStatement,
} from "@/lib/queries/customer-portal"
import LogoGreen from "@/assets/Logo-Green.svg"
import LogoLime from "@/assets/Logo-Lime.svg"

// ─────────────────────────────────────────────────────────────────────────
// "Account statement" feel — a slim top bar, a single balance-focused hero
// card, and tabbed document lists. See CUSTOMER-PORTAL-PLAN.md §4, §6, §7.
// ─────────────────────────────────────────────────────────────────────────

type InvoiceFilter = "outstanding" | "paid"

const OWING_STATUSES = new Set(["unpaid", "partially_paid", "overdue"])

function daysOverdue(dueDate: string): number {
  const due = new Date(dueDate + "T00:00:00")
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const ms = today.getTime() - due.getTime()
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)))
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00")
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const ms = target.getTime() - today.getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

function formatDate(value: string): string {
  const d = new Date(value + "T00:00:00")
  return d.toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatPeriod(dateFrom: string, dateTo: string): string {
  const from = new Date(dateFrom + "T00:00:00")
  const to = new Date(dateTo + "T00:00:00")
  const fromLabel = from.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
  })
  const toLabel = to.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
  return `${fromLabel} – ${toLabel}`
}

// Builds the same document data shape the public invoice page
// (pages/invoice-public/token.tsx) passes to InvoicePdf, then triggers the
// browser download. Called from the invoice row menu below.
async function downloadInvoicePdf(token: string): Promise<void> {
  const invoice = await getInvoiceByToken(token)

  type Snapshot = Record<string, string | null>
  const from = (invoice.from_details ?? {}) as Snapshot
  const customerSnap = (invoice.customer_details ?? {}) as Snapshot

  const documentData = buildInvoiceDocumentData(invoice, {
    from: {
      name: from.name,
      logo_url: from.logo_url,
      address_line1: from.address_line1,
      address_line2: from.address_line2,
      city: from.city,
      zip: from.zip,
      country_code: from.country_code,
      phone: from.phone,
      email: from.email,
      tax_id: from.tax_id,
    },
    customer: {
      name: customerSnap.name ?? invoice.customer_name,
      email: customerSnap.email,
      billing_email: customerSnap.billing_email,
      phone: customerSnap.phone,
      address_line1: customerSnap.address_line1,
      address_line2: customerSnap.address_line2,
      city: customerSnap.city,
      zip: customerSnap.zip,
      country: customerSnap.country,
    },
    customFields: parseCustomFields(invoice.custom_fields),
    publicUrl: `${window.location.origin}/i/${token}`,
  })

  await downloadPdf(<InvoicePdf data={documentData} />, invoice.invoice_number ?? "Invoice")
}

// ─────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────

function SkeletonPortal() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="size-8 animate-pulse rounded-full bg-muted" />
            <div className="hidden h-3 w-28 animate-pulse rounded-md bg-muted sm:block" />
          </div>
          <div className="h-3 w-32 animate-pulse rounded-md bg-muted" />
        </div>
      </div>
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="h-40 animate-pulse rounded-xl border bg-muted/40" />
        <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 w-full animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────

export function CustomerPortalPage() {
  const { portalId } = useParams<{ portalId: string }>()
  const { theme } = useTheme()
  const poweredByLogo = theme === "dark" ? LogoLime : LogoGreen

  const [invoiceFilter, setInvoiceFilter] = useState<InvoiceFilter>("outstanding")

  const summaryQuery = useQuery({
    queryKey: ["customer-portal", portalId],
    queryFn: () => getCustomerPortal(portalId!),
    enabled: !!portalId,
  })
  const invoicesQuery = useQuery({
    queryKey: ["customer-portal-invoices", portalId],
    queryFn: () => getCustomerPortalInvoices(portalId!),
    enabled: !!portalId,
  })
  const quotesQuery = useQuery({
    queryKey: ["customer-portal-quotes", portalId],
    queryFn: () => getCustomerPortalQuotes(portalId!),
    enabled: !!portalId,
  })
  const statementsQuery = useQuery({
    queryKey: ["customer-portal-statements", portalId],
    queryFn: () => getCustomerPortalStatements(portalId!),
    enabled: !!portalId,
  })

  const summary = summaryQuery.data
  const invoices = invoicesQuery.data ?? []
  const quotes = quotesQuery.data ?? []
  const statements = statementsQuery.data ?? []

  const isLoading =
    summaryQuery.isLoading ||
    invoicesQuery.isLoading ||
    quotesQuery.isLoading ||
    statementsQuery.isLoading

  const isError =
    summaryQuery.isError || invoicesQuery.isError || quotesQuery.isError || statementsQuery.isError

  const isNotFound = !portalId || (summaryQuery.isSuccess && summary === null)

  function retryAll() {
    void summaryQuery.refetch()
    void invoicesQuery.refetch()
    void quotesQuery.refetch()
    void statementsQuery.refetch()
  }

  useEffect(() => {
    if (isNotFound) {
      document.title = "Link unavailable · Travada Books"
      return
    }
    if (summary) {
      document.title = `${summary.customer_name} · ${summary.org_name}`
    }
  }, [isNotFound, summary])

  // Canceled invoices fit neither tab (listing them under Outstanding would
  // tell the customer they owe it), so the portal leaves them out; their
  // direct /i/:token link still opens with a canceled banner.
  const outstandingInvoices = useMemo(
    () => invoices.filter((inv) => OWING_STATUSES.has(inv.status)),
    [invoices],
  )
  const paidInvoices = useMemo(
    () => invoices.filter((inv) => inv.status === "paid"),
    [invoices],
  )

  const hasAnyDocuments = invoices.length > 0 || quotes.length > 0 || statements.length > 0

  if (!isLoading && isError) {
    return (
      <PortalShell poweredByLogo={poweredByLogo}>
        <ErrorState
          title="Couldn't load this portal"
          description="Something went wrong. Please try again."
          onRetry={retryAll}
        />
      </PortalShell>
    )
  }

  if (isLoading) {
    return <SkeletonPortal />
  }

  if (isNotFound || !summary) {
    return (
      <PortalShell poweredByLogo={poweredByLogo}>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-24 text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
            <Alert01Icon size={20} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold">This link isn&apos;t available</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            It may have been turned off or replaced. Ask the business for a new
            link.
          </p>
        </div>
      </PortalShell>
    )
  }

  return (
    <PortalShell
      poweredByLogo={poweredByLogo}
      org={{ name: summary.org_name, logoUrl: summary.org_logo_url }}
      customer={{ name: summary.customer_name }}
    >
      {!hasAnyDocuments ?
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-24 text-center animate-in fade-in-0 slide-in-from-bottom-2 duration-300 [animation-timing-function:var(--ease-out)]">
          <div className="mb-1 flex size-11 items-center justify-center rounded-full bg-muted">
            <Invoice01Icon size={18} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Nothing here yet</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Documents from {summary.org_name} will appear here.
          </p>
        </div>
      : <div className="flex flex-col gap-6">
          <BalanceHero summary={summary} />

          <Tabs defaultValue="invoices">
            <TabsList className="h-auto flex-wrap justify-start bg-transparent p-0 gap-1">
              <TabsTrigger
                value="invoices"
                className="h-8 rounded-md border data-active:border-input px-3"
              >
                Invoices ({invoices.length})
              </TabsTrigger>
              {quotes.length > 0 && (
                <TabsTrigger
                  value="quotes"
                  className="h-8 rounded-md border data-active:border-input px-3"
                >
                  Quotes ({quotes.length})
                </TabsTrigger>
              )}
              {statements.length > 0 && (
                <TabsTrigger
                  value="statements"
                  className="h-8 rounded-md border data-active:border-input px-3"
                >
                  Statements ({statements.length})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="invoices" className="mt-4">
              <InvoicesTab
                filter={invoiceFilter}
                onFilterChange={setInvoiceFilter}
                outstandingInvoices={outstandingInvoices}
                paidInvoices={paidInvoices}
                currency={summary.currency}
              />
            </TabsContent>

            {quotes.length > 0 && (
              <TabsContent value="quotes" className="mt-4">
                <QuotesTab quotes={quotes} currency={summary.currency} />
              </TabsContent>
            )}

            {statements.length > 0 && (
              <TabsContent value="statements" className="mt-4">
                <StatementsTab statements={statements} />
              </TabsContent>
            )}
          </Tabs>
        </div>
      }
    </PortalShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Balance hero
// ─────────────────────────────────────────────────────────────────────────

function BalanceHero({ summary }: { summary: CustomerPortalSummary }) {
  const { currency, outstanding, overdue_count, oldest_overdue_token, oldest_overdue_due_date, next_due_date } =
    summary

  return (
    <div className="rounded-xl border bg-background p-5 sm:p-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        {/* Left — the number */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">Balance due</p>
          <p
            className={cn(
              "text-4xl font-semibold tabular-nums tracking-tight sm:text-5xl",
              outstanding > 0 && "text-destructive",
            )}
          >
            {formatCurrency(outstanding, currency)}
          </p>
          {overdue_count > 0 && oldest_overdue_due_date ?
            <p className="text-xs text-destructive">
              {overdue_count} overdue · oldest due {formatDate(oldest_overdue_due_date)}
            </p>
          : next_due_date ?
            <p className="text-xs text-muted-foreground">
              Next due {formatDate(next_due_date)}
            </p>
          : <p className="text-xs text-muted-foreground">You&apos;re all paid up</p>
          }
          {overdue_count > 0 && oldest_overdue_token && (
            <Button
              size="sm"
              className="mt-1 w-fit"
              render={
                <a
                  href={`/i/${oldest_overdue_token}`}
                  target="_blank"
                  rel="noreferrer"
                />
              }
            >
              View oldest overdue invoice
              <ArrowUpRight01Icon size={13} />
            </Button>
          )}
        </div>

        {/* Right — key/value list */}
        <div className="flex flex-col sm:w-56 sm:shrink-0">
          <KeyValueRow label="Total invoiced" value={formatCurrency(summary.total_invoiced, currency)} />
          <KeyValueRow
            label="Paid"
            value={formatCurrency(summary.total_paid, currency)}
            valueClassName="text-green-600 dark:text-green-400"
          />
          <KeyValueRow label="Invoices" value={String(summary.invoice_count)} last />
        </div>
      </div>
    </div>
  )
}

function KeyValueRow({
  label,
  value,
  valueClassName,
  last,
}: {
  label: string
  value: string
  valueClassName?: string
  last?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-2.5",
        !last && "border-b",
      )}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-xs font-medium tabular-nums", valueClassName)}>
        {value}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Invoices tab
// ─────────────────────────────────────────────────────────────────────────

// Count pill on the Outstanding / Paid toggle. Inherits the toggle's own
// colour so it stays legible in both the selected and unselected state.
function FilterCount({ value }: { value: number }) {
  return (
    <span className="rounded-full bg-foreground/10 px-1.5 py-px text-[10px] font-medium tabular-nums text-muted-foreground">
      {value}
    </span>
  )
}

function InvoicesTab({
  filter,
  onFilterChange,
  outstandingInvoices,
  paidInvoices,
  currency,
}: {
  filter: InvoiceFilter
  onFilterChange: (filter: InvoiceFilter) => void
  outstandingInvoices: CustomerPortalInvoice[]
  paidInvoices: CustomerPortalInvoice[]
  currency: string
}) {
  const rows = filter === "outstanding" ? outstandingInvoices : paidInvoices

  return (
    <div className="flex flex-col gap-3">
      {/* Counts sit on the toggle so the customer can see how many invoices
          are behind each side without switching. */}
      <ToggleGroup
        value={[filter]}
        onValueChange={(vals) => {
          const next = vals[0] as InvoiceFilter | undefined
          if (next) onFilterChange(next)
        }}
        variant="outline"
        size="sm"
      >
        <ToggleGroupItem value="outstanding" className="gap-1.5 px-3 text-xs">
          Outstanding
          <FilterCount value={outstandingInvoices.length} />
        </ToggleGroupItem>
        <ToggleGroupItem value="paid" className="gap-1.5 px-3 text-xs">
          Paid
          <FilterCount value={paidInvoices.length} />
        </ToggleGroupItem>
      </ToggleGroup>

      {filter === "paid" && rows.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Paid invoices from the last 12 months.
        </p>
      )}

      {rows.length === 0 ?
        <p className="py-6 text-xs text-muted-foreground">
          {filter === "outstanding" ?
            "No outstanding invoices."
          : "No paid invoices in the last 12 months."}
        </p>
      : <div className="flex flex-col">
          {rows.map((inv) => (
            <InvoiceRow key={inv.token} invoice={inv} filter={filter} currency={currency} />
          ))}
        </div>
      }
    </div>
  )
}

function InvoiceRow({
  invoice,
  filter,
  currency,
}: {
  invoice: CustomerPortalInvoice
  filter: InvoiceFilter
  currency: string
}) {
  const isOverdue = invoice.status === "overdue"
  const total = invoice.total ?? 0
  const balance = total - invoice.amount_paid
  // Canceled invoices never owe money, regardless of their stored total.
  const amount =
    invoice.status === "canceled" ? 0
    : filter === "outstanding" ? balance
    : total

  function handleDownload() {
    toast.promise(downloadInvoicePdf(invoice.token), {
      loading: "Preparing PDF…",
      success: "PDF downloaded",
      error: "Failed to generate PDF",
    })
  }

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => window.open(`/i/${invoice.token}`, "_blank", "noreferrer")}
      onKeyDown={(e) => {
        if (e.key === "Enter") window.open(`/i/${invoice.token}`, "_blank", "noreferrer")
      }}
      className="flex cursor-pointer items-center justify-between gap-3 border-b py-3 transition-colors last:border-b-0 active:opacity-80 fine-hover:bg-muted/40"
    >
      <div className="min-w-0">
        <p className="truncate text-xs font-medium">{invoice.invoice_number}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Issued {invoice.issue_date ? formatDate(invoice.issue_date) : "—"}
        </p>
      </div>

      <div className="hidden shrink-0 sm:block sm:w-40">
        <p className="text-xs text-muted-foreground">
          Due {invoice.due_date ? formatDate(invoice.due_date) : "—"}
        </p>
        {isOverdue && invoice.due_date && (
          <p className="text-[11px] text-destructive">
            Overdue by {daysOverdue(invoice.due_date)} days
          </p>
        )}
        {invoice.status === "partially_paid" && (
          <p className="text-[11px] text-muted-foreground">
            {formatCurrency(invoice.amount_paid, currency)} of{" "}
            {formatCurrency(total, currency)} paid
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <div className="text-right">
          <p className="text-xs font-semibold tabular-nums">
            {formatCurrency(amount, currency)}
          </p>
          <div className="mt-1 flex justify-end">
            <InvoiceStatusBadge status={invoice.status as InvoiceStatus} />
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-sm" className="text-muted-foreground" />
              }
            >
              <MoreHorizontalIcon size={14} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => window.open(`/i/${invoice.token}`, "_blank", "noreferrer")}
              >
                <ArrowUpRight01Icon size={13} />
                View invoice
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownload}>
                <Download01Icon size={13} />
                Download PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <ChevronRightIcon size={14} className="text-muted-foreground" />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Quotes tab
// ─────────────────────────────────────────────────────────────────────────

function QuotesTab({ quotes, currency }: { quotes: CustomerPortalQuote[]; currency: string }) {
  return (
    <div className="flex flex-col">
      {quotes.map((q) => {
        const daysLeft = q.valid_until ? daysUntil(q.valid_until) : null
        const warn = daysLeft !== null && daysLeft <= 3
        return (
          <div
            key={q.token}
            className="flex items-center justify-between gap-3 border-b py-3 last:border-b-0"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                <QuoteIcon size={14} className="text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{q.quote_number}</p>
                <p
                  className={cn(
                    "text-[11px]",
                    warn ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
                  )}
                >
                  Valid until {q.valid_until ? formatDate(q.valid_until) : "—"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-xs font-medium tabular-nums">
                {formatCurrency(q.total ?? 0, currency)}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs"
                render={<a href={`/q/${q.token}`} target="_blank" rel="noreferrer" />}
              >
                Review
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Statements tab
// ─────────────────────────────────────────────────────────────────────────

function StatementsTab({ statements }: { statements: CustomerPortalStatement[] }) {
  return (
    <div className="flex flex-col">
      {statements.map((stmt) => (
        <a
          key={stmt.token}
          href={`/s/${stmt.token}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between gap-3 border-b py-3 transition-colors last:border-b-0 active:opacity-80 fine-hover:bg-muted/40"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
              <ReceiptTextIcon size={14} className="text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">
                {formatPeriod(stmt.date_from, stmt.date_to)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Generated {formatDate(stmt.created_at)}
              </p>
            </div>
          </div>
          <ChevronRightIcon size={14} className="shrink-0 text-muted-foreground" />
        </a>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Shell — top bar + content + footer
// ─────────────────────────────────────────────────────────────────────────

function PortalShell({
  children,
  poweredByLogo,
  org,
  customer,
}: {
  children: ReactNode
  poweredByLogo: string
  org?: { name: string; logoUrl: string | null }
  customer?: { name: string }
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {org && (
        <div className="border-b">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-2.5">
              {org.logoUrl ?
                <img
                  src={org.logoUrl}
                  alt={org.name}
                  className="h-7 w-auto max-w-[120px] object-contain"
                />
              : <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-[11px] font-bold">
                  {org.name.slice(0, 2).toUpperCase()}
                </div>
              }
              {/* On phones the two names fight for the same row, so the org
                  keeps only its logo and the customer line carries the page. */}
              <p className="hidden truncate text-sm font-semibold sm:block">{org.name}</p>
            </div>
            {customer && (
              <p className="min-w-0 truncate text-xs text-muted-foreground sm:shrink-0">
                Account for {customer.name}
              </p>
            )}
          </div>
        </div>
      )}
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </div>
      <footer className="border-t py-4 text-center">
        <a
          href="https://travadabooks.com?utm_source=customer-portal"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors fine-hover:text-foreground"
        >
          <img src={poweredByLogo} alt="" className="size-3.5" />
          Powered by Travada Books
        </a>
      </footer>
    </div>
  )
}
