import { supabase } from "@/lib/supabase"

// ─── Types ──────────────────────────────────────────────────────────────────
// metrics/activity/content are written by the worker (apps/worker/src/lib/insights).

export type InsightDelta = { current: number; previous: number; changePct: number | null }

export type InsightMetrics = {
  currency: string
  moneyIn: InsightDelta
  moneyOut: InsightDelta
  net: InsightDelta
  invoicesSent: { count: number; previousCount: number; amount: number }
  invoicesPaid: { count: number; previousCount: number; amount: number }
  overdue: { count: number; amount: number; oldestDaysOverdue: number | null }
  newCustomers: number
  quotes: { sent: number; accepted: number }
}

export type InsightAction = { id: string; text: string; href: string }

export type InsightContent = { title: string; summary: string; actions: InsightAction[] }

export type Insight = {
  id: string
  org_id: string
  period_start: string
  period_end: string
  currency: string
  metrics: InsightMetrics
  content: InsightContent
  created_at: string
}

const INSIGHT_SELECT = "id, org_id, period_start, period_end, currency, metrics, content, created_at"

// Newest first. 26 weeks is plenty for the list; older ones add nothing here.
export async function listInsights(orgId: string): Promise<Insight[]> {
  const { data, error } = await supabase
    .from("insights")
    .select(INSIGHT_SELECT)
    .eq("org_id", orgId)
    .order("period_start", { ascending: false })
    .limit(26)
  if (error) throw error
  return (data ?? []) as unknown as Insight[]
}
