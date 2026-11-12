// Drill-down links from Metrics charts into the Invoices / Transactions lists.
//
// Both list pages keep their filters in a `filters` URL param: a JSON array of
// bazza-ui FilterModel objects ({ columnId, type, operator, values }), with
// Date values serialized as ISO strings (see serializeFilters/deserializeFilters
// in pages/invoices/index.tsx and pages/transactions/index.tsx). Only column
// ids those pages translate into queries are used here:
//   invoices:     status (option), dueDate / issueDate (date)
//   quotes:       status (option), validUntil (date)
//   transactions: date (date), type (option), paymentMode (option), category (option)

import { endOfMonth, format, parseISO } from "date-fns"

type FilterModel = {
  columnId: string
  type: "date" | "option"
  operator: string
  values: unknown[]
}

/**
 * Date filter values are Dates on the page and get re-serialized via
 * toISOString(), then cut to YYYY-MM-DD with `.split("T")[0]`. Pinning to
 * 12:00 UTC keeps that round-trip on the intended calendar day in every
 * timezone between UTC−11 and UTC+11 (local midnight would slip a day east of
 * Greenwich).
 */
function dateValue(isoDate: string): string {
  return `${isoDate.slice(0, 10)}T12:00:00.000Z`
}

function dateFilter(columnId: string, from?: string, to?: string): FilterModel | null {
  if (from && to) return { columnId, type: "date", operator: "is between", values: [dateValue(from), dateValue(to)] }
  if (from) return { columnId, type: "date", operator: "is on or after", values: [dateValue(from)] }
  if (to) return { columnId, type: "date", operator: "is on or before", values: [dateValue(to)] }
  return null
}

function buildUrl(path: string, filters: (FilterModel | null)[]): string {
  const active = filters.filter((f): f is FilterModel => f !== null)
  if (active.length === 0) return path
  const params = new URLSearchParams({ filters: JSON.stringify(active) })
  return `${path}?${params.toString()}`
}

export function invoicesDrilldownUrl(opts: {
  statuses?: string[]
  dueFrom?: string
  dueTo?: string
  issuedFrom?: string
  issuedTo?: string
}): string {
  return buildUrl("/invoices", [
    opts.statuses?.length
      ? { columnId: "status", type: "option", operator: opts.statuses.length > 1 ? "is any of" : "is", values: opts.statuses }
      : null,
    dateFilter("dueDate", opts.dueFrom, opts.dueTo),
    dateFilter("issueDate", opts.issuedFrom, opts.issuedTo),
  ])
}

export function transactionsDrilldownUrl(opts: {
  from?: string
  to?: string
  type?: "income" | "expense"
  paymentModes?: string[]
  categoryIds?: string[]
}): string {
  return buildUrl("/transactions", [
    dateFilter("date", opts.from, opts.to),
    opts.type ? { columnId: "type", type: "option", operator: "is", values: [opts.type] } : null,
    opts.paymentModes?.length
      ? {
          columnId: "paymentMode",
          type: "option",
          operator: opts.paymentModes.length > 1 ? "is any of" : "is",
          values: opts.paymentModes,
        }
      : null,
    opts.categoryIds?.length
      ? {
          columnId: "category",
          type: "option",
          operator: opts.categoryIds.length > 1 ? "is any of" : "is",
          values: opts.categoryIds,
        }
      : null,
  ])
}

export function quotesDrilldownUrl(opts: { statuses?: string[]; validFrom?: string; validTo?: string }): string {
  return buildUrl("/quotes", [
    opts.statuses?.length
      ? { columnId: "status", type: "option", operator: opts.statuses.length > 1 ? "is any of" : "is", values: opts.statuses }
      : null,
    dateFilter("validUntil", opts.validFrom, opts.validTo),
  ])
}

/** Income transactions for the calendar month containing `monthDate`. */
export function incomeForMonthUrl(monthDate: Date | string): string {
  const start = typeof monthDate === "string" ? parseISO(monthDate.slice(0, 10)) : monthDate
  return transactionsDrilldownUrl({
    from: format(start, "yyyy-MM-01"),
    to: format(endOfMonth(start), "yyyy-MM-dd"),
    type: "income",
  })
}
