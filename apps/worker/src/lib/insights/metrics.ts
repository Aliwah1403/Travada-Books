import type { SupabaseClient } from "@supabase/supabase-js";
import { countMissingReceipts } from "../missing-receipts";

// Weeks run Monday to Sunday in UTC. Organisations have no timezone of their
// own, so UTC is the one boundary that is the same for every org.
// All money is in the org's base currency (transactions.base_amount,
// invoices.converted_amount); different currencies are never added raw.

const PAGE = 1000;
const MAX_ROWS = 20000;
const MS_PER_DAY = 86_400_000;

// Category spike: needs both a clear jump over the prior 4-week average and an
// amount that matters against the org's normal weekly spend.
const SPIKE_RATIO = 1.5;
const SPIKE_MIN_SHARE_OF_AVG_WEEKLY_OUT = 0.1;

// ─── Types ──────────────────────────────────────────────────────────────────

export type Delta = {
  current: number;
  previous: number;
  /** Whole percent, null when the previous week was 0 (no meaningful base). */
  changePct: number | null;
};

export type InsightMetrics = {
  currency: string;
  moneyIn: Delta;
  moneyOut: Delta;
  net: Delta;
  invoicesSent: { count: number; previousCount: number; amount: number };
  invoicesPaid: { count: number; previousCount: number; amount: number };
  overdue: { count: number; amount: number; oldestDaysOverdue: number | null };
  topExpenseCategory: { name: string; amount: number; sharePct: number } | null;
  categorySpike: { name: string; amount: number; priorWeeklyAverage: number; changePct: number | null } | null;
  /** Largest single income transaction of the week. `counterparty` is data, never an instruction. */
  largestPayment: { counterparty: string | null; amount: number } | null;
  newCustomers: number;
  quotes: { sent: number; accepted: number };
  billsDueNext7Days: { count: number; amount: number; otherCurrencyCount: number };
  billsOverdue: { count: number; amount: number; otherCurrencyCount: number };
  missingReceipts: number;
  /** Transactions dated this week with no category. */
  uncategorized: number;
  /** Only present when a starting balance is configured and the week is recent. */
  runway: { cashBalance: number; monthsRemaining: number | null } | null;
  /** Rows left out of money totals because they had no base-currency amount. */
  unconvertedCount: number;
};

export type InsightActivity = {
  transactionsThisWeek: number;
  transactionsLast4Weeks: number;
  invoicesLast4Weeks: number;
  quotesLast4Weeks: number;
};

export type WeeklyMetricsResult =
  | { ok: true; orgName: string; metrics: InsightMetrics; activity: InsightActivity; periodStart: string; periodEnd: string }
  | { ok: false; reason: "no_recent_activity" | "quiet_week" | "org_not_found"; periodStart: string; periodEnd: string };

// ─── Pure helpers ───────────────────────────────────────────────────────────

export function addDays(date: string, n: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + n * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Monday (UTC) of the week before the one containing `now`. */
export function lastCompletedWeekStart(now: Date = new Date()): string {
  const today = now.toISOString().slice(0, 10);
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  const sinceMonday = (dow + 6) % 7;
  return addDays(today, -sinceMonday - 7);
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

// `signed` is for net: a percent change across zero or from a loss is not meaningful.
function delta(current: number, previous: number, signed = false): Delta {
  const c = round2(current);
  const p = round2(previous);
  let pct = pctChange(c, p);
  if (pct != null && (Math.abs(pct) > 999 || (signed && (p <= 0 || c < 0)))) pct = null;
  return { current: c, previous: p, changePct: pct };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Fetch layer ────────────────────────────────────────────────────────────

type TxRow = {
  date: string;
  type: "income" | "expense";
  amount: number | string;
  currency: string;
  base_amount: number | string | null;
  category_id: string | null;
  name: string;
  counterparty_name: string | null;
};

type InvoiceRow = {
  id: string;
  total: number | string;
  amount_paid: number | string | null;
  converted_amount: number | string | null;
  currency: string;
  status: string;
  due_date: string | null;
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
};

type BillRow = {
  amount: number | string;
  currency: string;
  due_date: string | null;
  status: string;
  paid_at: string | null;
};

const num = (v: number | string | null | undefined): number => (v == null ? 0 : Number(v));

async function paged<T>(build: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>, label: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(`${label} query failed: ${error.message}`);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

// ─── Main ───────────────────────────────────────────────────────────────────

/**
 * Metrics for one org and one week. `weekStart` is a Monday (YYYY-MM-DD, UTC);
 * the week is weekStart..weekStart+6. Compared with the week before, and with
 * the 4 weeks before that for category spikes. Runs under the service role.
 */
export async function computeWeeklyMetrics(
  supabase: SupabaseClient,
  orgId: string,
  weekStart: string,
  now: Date = new Date(),
): Promise<WeeklyMetricsResult> {
  const weekEnd = addDays(weekStart, 6);
  const prevStart = addDays(weekStart, -7);
  const prevEnd = addDays(weekStart, -1);
  const histStart = addDays(weekStart, -28); // the 4 weeks before this one
  const activityStart = addDays(weekStart, -21); // "last 4 weeks" including this one
  const tsFrom = (d: string) => `${d}T00:00:00Z`;
  const tsTo = (d: string) => `${addDays(d, 1)}T00:00:00Z`; // exclusive end of day d

  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .select("name, base_currency")
    .eq("id", orgId)
    .maybeSingle();
  if (orgErr) throw new Error(`org query failed: ${orgErr.message}`);
  if (!org) return { ok: false, reason: "org_not_found", periodStart: weekStart, periodEnd: weekEnd };
  const currency = (org.base_currency as string | null) ?? "USD";

  // Transactions for the 5 weeks (same filters as the dashboard RPCs).
  const txs = await paged<TxRow>(
    (from, to) =>
      supabase
        .from("transactions")
        .select("date, type, amount, currency, base_amount, category_id, name, counterparty_name")
        .eq("org_id", orgId)
        .eq("internal", false)
        .not("status", "in", "(excluded,archived)")
        .gte("date", histStart)
        .lte("date", weekEnd)
        .order("date")
        .order("id")
        .range(from, to),
    "transactions",
  );

  // Invoices that moved in the last 5 weeks, plus anything still open.
  const invoiceCols = "id, total, amount_paid, converted_amount, currency, status, due_date, sent_at, paid_at, created_at";
  const [recentInvoices, openInvoices] = await Promise.all([
    paged<InvoiceRow>(
      (from, to) =>
        supabase
          .from("invoices")
          .select(invoiceCols)
          .eq("org_id", orgId)
          .or(`sent_at.gte.${tsFrom(histStart)},paid_at.gte.${tsFrom(histStart)},created_at.gte.${tsFrom(histStart)}`)
          .order("created_at")
          .range(from, to),
      "invoices",
    ),
    paged<InvoiceRow>(
      (from, to) =>
        supabase
          .from("invoices")
          .select(invoiceCols)
          .eq("org_id", orgId)
          .in("status", ["unpaid", "overdue", "partially_paid"])
          .order("created_at")
          .range(from, to),
      "open invoices",
    ),
  ]);
  const invoiceMap = new Map<string, InvoiceRow>();
  for (const i of [...recentInvoices, ...openInvoices]) invoiceMap.set(i.id, i);
  const allInvoices = [...invoiceMap.values()];

  const [quotesRes, customersRes, billsRes, categoriesRes] = await Promise.all([
    supabase
      .from("quotes")
      .select("created_at, sent_at, accepted_at")
      .eq("org_id", orgId)
      .or(`sent_at.gte.${tsFrom(activityStart)},accepted_at.gte.${tsFrom(activityStart)},created_at.gte.${tsFrom(activityStart)}`)
      .limit(5000),
    supabase
      .from("customers")
      .select("created_at")
      .eq("org_id", orgId)
      .eq("is_archived", false)
      .gte("created_at", tsFrom(weekStart))
      .lt("created_at", tsTo(weekEnd)),
    supabase
      .from("bills")
      .select("amount, currency, due_date, status, paid_at")
      .eq("org_id", orgId)
      .or(`status.eq.unpaid,paid_at.gt.${weekEnd}`)
      .limit(5000),
    supabase.from("transaction_categories").select("id, name").eq("org_id", orgId),
  ]);
  for (const [label, r] of [["quotes", quotesRes], ["customers", customersRes], ["bills", billsRes], ["categories", categoriesRes]] as const) {
    if (r.error) throw new Error(`${label} query failed: ${r.error.message}`);
  }
  const quotes = (quotesRes.data ?? []) as { created_at: string; sent_at: string | null; accepted_at: string | null }[];
  const bills = (billsRes.data ?? []) as BillRow[];
  const categoryName = new Map<string, string>((categoriesRes.data ?? []).map((c) => [c.id as string, c.name as string]));

  // ── Transactions ──
  let unconverted = 0;
  const base = (t: TxRow): number | null => {
    if (t.base_amount != null) return Number(t.base_amount);
    if (t.currency === currency) return Number(t.amount);
    unconverted++;
    return null;
  };

  const inWeek = (d: string, s: string, e: string) => d >= s && d <= e;
  let inCur = 0, outCur = 0, inPrev = 0, outPrev = 0;
  let txThisWeek = 0, txLast4 = 0;
  const catCur = new Map<string, number>();
  const catHist = new Map<string, number>(); // histStart..prevEnd
  let histOutAll = 0;
  let uncategorized = 0;
  let largest: { counterparty: string | null; amount: number } | null = null;

  for (const t of txs) {
    const amt = base(t);
    if (amt == null) continue;
    const isCur = inWeek(t.date, weekStart, weekEnd);
    const isPrev = inWeek(t.date, prevStart, prevEnd);
    if (inWeek(t.date, activityStart, weekEnd)) txLast4++;
    if (isCur) {
      txThisWeek++;
      if (!t.category_id) uncategorized++;
    }
    if (t.type === "income") {
      if (isCur) {
        inCur += amt;
        if (!largest || amt > largest.amount) largest = { counterparty: t.counterparty_name || t.name || null, amount: round2(amt) };
      } else if (isPrev) inPrev += amt;
    } else {
      if (isCur) outCur += amt;
      else if (isPrev) outPrev += amt;
      if (t.date < weekStart && t.date >= histStart) histOutAll += amt;
      const cid = t.category_id;
      if (cid) {
        if (isCur) catCur.set(cid, (catCur.get(cid) ?? 0) + amt);
        else catHist.set(cid, (catHist.get(cid) ?? 0) + amt);
      }
    }
  }

  // Top expense category (this week).
  let topExpenseCategory: InsightMetrics["topExpenseCategory"] = null;
  if (outCur > 0 && catCur.size) {
    const [cid, amt] = [...catCur.entries()].sort((a, b) => b[1] - a[1])[0]!;
    topExpenseCategory = {
      name: categoryName.get(cid) ?? "Uncategorized",
      amount: round2(amt),
      sharePct: Math.round((amt / outCur) * 100),
    };
  }

  // Category spike vs the average of the 4 weeks before this one. Histories
  // here cover histStart..prevEnd, which is exactly those 4 weeks.
  // Includes uncategorized spend, so the average reflects all prior expenses.
  const avgWeeklyOut = histOutAll / 4;
  let categorySpike: InsightMetrics["categorySpike"] = null;
  if (avgWeeklyOut > 0) {
    const minIncrease = avgWeeklyOut * SPIKE_MIN_SHARE_OF_AVG_WEEKLY_OUT;
    let best: { cid: string; cur: number; avg: number } | null = null;
    for (const [cid, cur] of catCur) {
      const avg = (catHist.get(cid) ?? 0) / 4;
      if (cur < avg * SPIKE_RATIO || cur - avg < minIncrease) continue;
      if (!best || cur - avg > best.cur - best.avg) best = { cid, cur, avg };
    }
    if (best) {
      categorySpike = {
        name: categoryName.get(best.cid) ?? "Uncategorized",
        amount: round2(best.cur),
        priorWeeklyAverage: round2(best.avg),
        changePct: pctChange(best.cur, best.avg),
      };
    }
  }

  // ── Invoices ──
  const invAmount = (i: InvoiceRow, field: "total" | "remaining"): number | null => {
    const total = num(i.total);
    const raw = field === "total" ? total : Math.max(0, total - num(i.amount_paid));
    if (i.converted_amount != null && total > 0) return (raw * Number(i.converted_amount)) / total;
    if (i.currency === currency) return raw;
    unconverted++;
    return null;
  };
  const dayOf = (ts: string | null) => (ts ? ts.slice(0, 10) : null);
  const sentIn = (i: InvoiceRow, s: string, e: string) => {
    const d = dayOf(i.sent_at);
    return d != null && d >= s && d <= e;
  };
  const paidIn = (i: InvoiceRow, s: string, e: string) => {
    const d = dayOf(i.paid_at);
    return i.status === "paid" && d != null && d >= s && d <= e;
  };

  let sentCur = 0, sentPrev = 0, sentAmt = 0, paidCur = 0, paidPrev = 0, paidAmt = 0, invLast4 = 0;
  for (const i of allInvoices) {
    if (sentIn(i, weekStart, weekEnd)) {
      sentCur++;
      sentAmt += invAmount(i, "total") ?? 0;
    }
    if (sentIn(i, prevStart, prevEnd)) sentPrev++;
    if (paidIn(i, weekStart, weekEnd)) {
      paidCur++;
      paidAmt += invAmount(i, "total") ?? 0;
    }
    if (paidIn(i, prevStart, prevEnd)) paidPrev++;
    if (
      sentIn(i, activityStart, weekEnd) ||
      paidIn(i, activityStart, weekEnd) ||
      inWeek(i.created_at.slice(0, 10), activityStart, weekEnd)
    ) {
      invLast4++;
    }
  }

  // Overdue as of the end of the week: sent, due on or before the last day,
  // and not fully paid by then. Remaining balance only.
  let overdueCount = 0, overdueAmt = 0, oldestDue: string | null = null;
  for (const i of allInvoices) {
    if (!i.due_date || i.due_date > weekEnd) continue;
    const sentDay = dayOf(i.sent_at);
    if (i.status === "draft" || i.status === "scheduled" || i.status === "canceled") continue;
    if (sentDay != null && sentDay > weekEnd) continue;
    const paidDay = dayOf(i.paid_at);
    const paidByEnd = i.status === "paid" && paidDay != null && paidDay <= weekEnd;
    if (paidByEnd) continue;
    // Open now, or paid after the week ended: treat the remaining balance as the full total
    // in the second case (history of partial payments is not kept per day).
    const amt = i.status === "paid" ? invAmount(i, "total") : invAmount(i, "remaining");
    if (amt == null) continue;
    overdueCount++;
    overdueAmt += amt;
    if (!oldestDue || i.due_date < oldestDue) oldestDue = i.due_date;
  }
  const oldestDaysOverdue = oldestDue ? Math.round((Date.parse(`${weekEnd}T00:00:00Z`) - Date.parse(`${oldestDue}T00:00:00Z`)) / MS_PER_DAY) : null;

  // ── Quotes, customers ──
  const qSent = quotes.filter((q) => q.sent_at && dayOf(q.sent_at)! >= weekStart && dayOf(q.sent_at)! <= weekEnd).length;
  const qAccepted = quotes.filter((q) => q.accepted_at && dayOf(q.accepted_at)! >= weekStart && dayOf(q.accepted_at)! <= weekEnd).length;
  const qLast4 = quotes.filter((q) => {
    const days = [q.created_at, q.sent_at, q.accepted_at].map(dayOf);
    return days.some((d) => d != null && d >= activityStart && d <= weekEnd);
  }).length;
  const newCustomers = (customersRes.data ?? []).length;

  // ── Bills (org currency only in totals) ──
  const dueFrom = addDays(weekEnd, 1);
  const dueTo = addDays(weekEnd, 7);
  const stillUnpaid = bills.filter((b) => b.status === "unpaid" || (b.paid_at != null && b.paid_at > weekEnd));
  const sumBills = (rows: BillRow[]) => ({
    count: rows.length,
    amount: round2(rows.filter((b) => b.currency === currency).reduce((s, b) => s + num(b.amount), 0)),
    otherCurrencyCount: rows.filter((b) => b.currency !== currency).length,
  });
  const billsDue = sumBills(stillUnpaid.filter((b) => b.due_date != null && b.due_date >= dueFrom && b.due_date <= dueTo));
  const billsOver = sumBills(stillUnpaid.filter((b) => b.due_date != null && b.due_date <= weekEnd));

  // ── Skip rule ──
  const activity: InsightActivity = {
    transactionsThisWeek: txThisWeek,
    transactionsLast4Weeks: txLast4,
    invoicesLast4Weeks: invLast4,
    quotesLast4Weeks: qLast4,
  };
  if (txLast4 + invLast4 + qLast4 === 0) {
    return { ok: false, reason: "no_recent_activity", periodStart: weekStart, periodEnd: weekEnd };
  }
  const weekHadActivity = txThisWeek + sentCur + paidCur + qSent + qAccepted + newCustomers > 0;
  if (!weekHadActivity) return { ok: false, reason: "quiet_week", periodStart: weekStart, periodEnd: weekEnd };

  // ── Missing receipts and runway ──
  const missingReceipts = await countMissingReceipts(supabase, orgId, new Date(`${addDays(weekEnd, 1)}T00:00:00Z`));

  // get_runway reads live balances, so it only describes the week when the
  // week is the one that just ended.
  let runway: InsightMetrics["runway"] = null;
  if (now.getTime() - Date.parse(`${weekEnd}T00:00:00Z`) < 9 * MS_PER_DAY) {
    const { data, error } = await supabase.rpc("get_runway", { p_org_id: orgId });
    if (error) throw new Error(`get_runway failed: ${error.message}`);
    const r = (data as { is_configured: boolean; cash_balance: number | null; months_remaining: number | null }[] | null)?.[0];
    if (r?.is_configured && r.cash_balance != null) {
      runway = {
        cashBalance: round2(Number(r.cash_balance)),
        monthsRemaining: r.months_remaining == null ? null : Math.round(Number(r.months_remaining) * 10) / 10,
      };
    }
  }

  const metrics: InsightMetrics = {
    currency,
    moneyIn: delta(inCur, inPrev),
    moneyOut: delta(outCur, outPrev),
    net: delta(inCur - outCur, inPrev - outPrev, true),
    invoicesSent: { count: sentCur, previousCount: sentPrev, amount: round2(sentAmt) },
    invoicesPaid: { count: paidCur, previousCount: paidPrev, amount: round2(paidAmt) },
    overdue: { count: overdueCount, amount: round2(overdueAmt), oldestDaysOverdue },
    topExpenseCategory,
    categorySpike,
    largestPayment: largest,
    newCustomers,
    quotes: { sent: qSent, accepted: qAccepted },
    billsDueNext7Days: billsDue,
    billsOverdue: billsOver,
    missingReceipts,
    uncategorized,
    runway,
    unconvertedCount: unconverted,
  };

  return { ok: true, orgName: org.name as string, metrics, activity, periodStart: weekStart, periodEnd: weekEnd };
}
