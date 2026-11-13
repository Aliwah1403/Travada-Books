import { Fragment, useMemo, useState } from "react"
import { Link, useLocation } from "react-router"
import { useQuery } from "@tanstack/react-query"
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@travada-books/ui/components/breadcrumb"
import { Button } from "@travada-books/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@travada-books/ui/components/dropdown-menu"
import { useAuth } from "@/contexts/auth-context"
import { getInvoice } from "@/lib/queries/invoices"
import { getQuote } from "@/lib/queries/quotes"
import { getCustomer } from "@/lib/queries/customers"
import { getStatement } from "@/lib/queries/statements"
import { buildBreadcrumbs, crumbRecordIds, type Crumb, type CrumbOrigin } from "@/lib/breadcrumbs"

// ─── Where the user came from ───────────────────────────────────────────────
// An invoice or quote opened from a customer's page keeps that customer in
// its trail, including on its edit page and after a refresh (sessionStorage,
// keyed by path). Arriving any other way drops it.

const ORIGIN_KEY = "travada:crumb-origins"
const CUSTOMER_PATH = /^\/customers\/([^/]+)$/
const DOC_PATH = /^\/(invoices|quotes)\/([^/]+)(?:\/edit)?$/

function readOrigins(): Record<string, CrumbOrigin> {
  try {
    return JSON.parse(sessionStorage.getItem(ORIGIN_KEY) ?? "{}") as Record<string, CrumbOrigin>
  } catch {
    return {}
  }
}

function writeOrigins(origins: Record<string, CrumbOrigin>) {
  try {
    sessionStorage.setItem(ORIGIN_KEY, JSON.stringify(origins))
  } catch {
    // Private mode / storage blocked: the trail just falls back to the section.
  }
}

/** The record a doc path is about ("/invoices/x/edit" → "/invoices/x"). */
const docRoot = (path: string) => path.replace(/\/edit$/, "")

function useCrumbOrigin(pathname: string): CrumbOrigin | null {
  const [state, setState] = useState<{ path: string; prev: string | null }>({ path: pathname, prev: null })
  if (state.path !== pathname) setState({ path: pathname, prev: state.path })

  return useMemo(() => {
    if (!DOC_PATH.test(pathname)) return null
    const origins = readOrigins()
    const prev = state.prev
    const fromCustomer = prev ? CUSTOMER_PATH.exec(prev) : null
    let origin: CrumbOrigin | null | undefined
    if (fromCustomer) {
      origin = { customerId: fromCustomer[1]! }
    } else if (prev && DOC_PATH.test(prev) && docRoot(prev) === docRoot(pathname)) {
      // Detail ⇄ edit of the same record keeps its trail.
      origin = origins[docRoot(prev)] ?? null
    } else if (prev === null) {
      // First render (refresh / deep link): reuse what this tab saw before.
      origin = origins[docRoot(pathname)] ?? null
    } else {
      origin = null
    }
    const next = { ...origins }
    if (origin) next[docRoot(pathname)] = origin
    else delete next[docRoot(pathname)]
    writeOrigins(next)
    return origin
  }, [pathname, state.prev])
}

// ─── Record names ───────────────────────────────────────────────────────────
// Same query keys and fetchers as the pages themselves, so the trail reads
// from cache and adds no requests.

function useCrumbRecords(pathname: string, origin: CrumbOrigin | null) {
  const { orgId } = useAuth()
  const ids = crumbRecordIds(pathname)

  const invoice = useQuery({
    queryKey: ["invoice", ids.invoiceId],
    queryFn: () => getInvoice(ids.invoiceId!),
    enabled: !!ids.invoiceId,
  })
  const quote = useQuery({
    queryKey: ["quote", ids.quoteId],
    queryFn: () => getQuote(ids.quoteId!, orgId!),
    enabled: !!ids.quoteId && !!orgId,
  })
  const customerId = ids.customerId ?? origin?.customerId
  const customer = useQuery({
    queryKey: ["customer", customerId],
    queryFn: () => getCustomer(customerId!, orgId!),
    enabled: !!customerId && !!orgId,
  })
  const statement = useQuery({
    queryKey: ["statement", ids.statementId],
    queryFn: () => getStatement(ids.statementId!, orgId!),
    enabled: !!ids.statementId && !!orgId,
  })
  const statementCustomer = useQuery({
    queryKey: ["customer", statement.data?.customer_id],
    queryFn: () => getCustomer(statement.data!.customer_id, orgId!),
    enabled: !!statement.data?.customer_id && !!orgId,
  })

  // `undefined` = still loading (shows "…"), `null` = no name to show.
  const settled = <T,>(q: { data?: T; isError: boolean }, pick: (d: T) => string | null) =>
    q.data !== undefined ? pick(q.data) : q.isError ? null : undefined

  return {
    records: {
      invoice: settled(invoice, (d) => d.invoice_number ?? "Draft invoice"),
      quote: settled(quote, (d) => (d ? (d.quote_number ?? "Draft quote") : null)),
      customer: ids.customerId ? settled(customer, (d) => d.name) : undefined,
      statementCustomer: ids.statementId
        ? statement.isError
          ? null
          : statementCustomer.data
            ? { id: statementCustomer.data.id, name: statementCustomer.data.name }
            : undefined
        : undefined,
    },
    originName: origin ? settled(customer, (d) => d.name) : undefined,
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PageBreadcrumbs() {
  const { pathname, search } = useLocation()
  const origin = useCrumbOrigin(pathname)
  const { records, originName } = useCrumbRecords(pathname, origin)

  const crumbs = useMemo(
    () => buildBreadcrumbs(pathname, search, records, origin ? { ...origin, customerName: originName } : null),
    [pathname, search, records, origin, originName],
  )

  const current = crumbs[crumbs.length - 1]

  if (!current) return null
  const ancestors = crumbs.slice(0, -1)

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap text-sm">
        {/* Phones: everything above the current page folds into one menu. */}
        {ancestors.length > 0 && (
          <>
            <BreadcrumbItem className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" />}>
                  <BreadcrumbEllipsis aria-hidden="true" />
                  <span className="sr-only">Show path</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {ancestors.map((c, i) =>
                    c.href ? (
                      <DropdownMenuItem key={i} render={<Link to={c.href} />}>
                        {c.label}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem key={i} disabled>
                        {c.label}
                      </DropdownMenuItem>
                    ),
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="md:hidden" />
          </>
        )}

        {/* md and up: the full trail. */}
        {ancestors.map((c, i) => (
          <Fragment key={i}>
            <BreadcrumbItem className="hidden min-w-0 md:inline-flex">
              <AncestorCrumb crumb={c} />
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:inline-flex" />
          </Fragment>
        ))}

        <BreadcrumbItem className="min-w-0">
          <BreadcrumbPage className="truncate font-medium">{current.label}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

function AncestorCrumb({ crumb }: { crumb: Crumb }) {
  if (!crumb.href) return <span className="max-w-48 truncate">{crumb.label}</span>
  return (
    <BreadcrumbLink className="max-w-48 truncate" render={<Link to={crumb.href} />}>
      {crumb.label}
    </BreadcrumbLink>
  )
}
