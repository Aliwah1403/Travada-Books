import { addDays, format, parseISO, subDays } from "date-fns"
import { supabase } from "@/lib/supabase"

// ─── Needs attention (Overview) ──────────────────────────────────────────────
//
// Small live counts for the Overview's "Needs attention" card. Counts use
// `count: "exact", head: true` (no rows come back); only overdue invoices fetch
// rows, because the card shows their amount too.

export type NeedsAttention = {
  overdueInvoices: { count: number; amount: number }
  billsDue: { count: number; pastDue: number }
  draftInvoices: number
  quotesAwaiting: number
  uncategorizedExpenses: number
}

export const needsAttentionQueryKey = (orgId: string, today: string) => ["needs-attention", orgId, today] as const

/** Bills due within this many days (or already past due) count. */
export const BILLS_DUE_WINDOW_DAYS = 7
export const UNCATEGORIZED_WINDOW_DAYS = 30

const num = (v: unknown) => {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

export async function getNeedsAttention(orgId: string, today: string): Promise<NeedsAttention> {
  const day = parseISO(today)
  const billsUntil = format(addDays(day, BILLS_DUE_WINDOW_DAYS), "yyyy-MM-dd")
  const uncategorizedFrom = format(subDays(day, UNCATEGORIZED_WINDOW_DAYS - 1), "yyyy-MM-dd")

  const [overdue, billsDue, billsPast, drafts, quotes, uncategorized] = await Promise.all([
    // Same definition as get_overdue_invoices: status 'overdue', or still
    // open with a due date before today (the status flip runs on a schedule).
    supabase
      .from("invoices")
      .select("total, amount_paid, converted_amount")
      .eq("org_id", orgId)
      .or(`status.eq.overdue,and(status.in.(unpaid,partially_paid),due_date.lt.${today})`)
      .limit(1000),
    supabase
      .from("bills")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "unpaid")
      .lte("due_date", billsUntil),
    supabase
      .from("bills")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "unpaid")
      .lt("due_date", today),
    supabase.from("invoices").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "draft"),
    // Sent and still valid — a sent quote past valid_until shows as expired.
    supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "sent")
      .or(`valid_until.is.null,valid_until.gte.${today}`),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("type", "expense")
      .is("category_id", null)
      .eq("internal", false)
      .not("status", "in", "(excluded,archived)")
      .gte("date", uncategorizedFrom)
      .lte("date", today),
  ])

  for (const res of [overdue, billsDue, billsPast, drafts, quotes, uncategorized]) {
    if (res.error) throw res.error
  }

  let overdueAmount = 0
  for (const row of (overdue.data ?? []) as { total: unknown; amount_paid: unknown; converted_amount: unknown }[]) {
    const total = num(row.total)
    const balance = Math.max(0, total - num(row.amount_paid))
    const converted = row.converted_amount != null ? num(row.converted_amount) : null
    overdueAmount += balance * (converted != null && total > 0 ? converted / total : 1)
  }

  return {
    overdueInvoices: { count: overdue.data?.length ?? 0, amount: overdueAmount },
    billsDue: { count: billsDue.count ?? 0, pastDue: billsPast.count ?? 0 },
    draftInvoices: drafts.count ?? 0,
    quotesAwaiting: quotes.count ?? 0,
    uncategorizedExpenses: uncategorized.count ?? 0,
  }
}
