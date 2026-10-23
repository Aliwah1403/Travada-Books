// One-off: import the n8n-era Travada Systems invoices into Books, then link
// them to the payments (transactions) that already exist, WITHOUT creating
// any new revenue.
//
//   node apps/worker/scripts/import-systems-history.ts import --invoices invoices.json [--apply]
//   node apps/worker/scripts/import-systems-history.ts match [--apply-from approved.csv]
//
// Common flags: --report <file>  --apply  --i-know-this-is-prod (needed for any non-local host)
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SYSTEMS_BOOKS_ORG_ID,
//      SYSTEMS_BILLING_USER_ID (import only: becomes invoices.user_id)
//
// Dry run by default. Plan: Planning/SYSTEMS-BOOKS-PRIVATE-BILLING-PLAN.md §9, §11.
// This script never sends email, renders PDFs, calls edge functions, or
// inserts a payment without transaction_id.
import { parseArgs } from "node:util";
import {
  EXTERNAL_SOURCE,
  addDaysISO,
  addMonthsISO,
  fetchAll,
  initEnv,
  loadEjsonArray,
  must,
  num,
  printCounts,
  readCsv,
  round2,
  str,
  toLocalDate,
  writeCsv,
} from "./systems-script-common.ts";

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    invoices: { type: "string" },
    "apply-from": { type: "string" },
    report: { type: "string" },
    apply: { type: "boolean", default: false },
    "i-know-this-is-prod": { type: "boolean", default: false },
  },
});

const sub = positionals[0];
if (sub !== "import" && sub !== "match") {
  console.error(
    "Usage:\n  import-systems-history.ts import --invoices invoices.json [--apply] [--report f.csv]\n" +
      "  import-systems-history.ts match [--apply-from approved.csv] [--report f.csv]",
  );
  process.exit(1);
}

// match --apply-from is the write mode for `match`; import uses --apply.
const writing = sub === "import" ? args.apply! : Boolean(args["apply-from"]);
const env = initEnv({ apply: writing, iKnowThisIsProd: args["i-know-this-is-prod"]! });
const { supabase, orgId } = env;


// ════════════════════════════════════════════════════════════════════════════
// import
// ════════════════════════════════════════════════════════════════════════════

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};
const MON_LABEL = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad = (n: number) => String(n).padStart(2, "0");

/** "May 1 - Jul 31, 2026" / "Nov 1, 2025 - Jan 31, 2026" -> { start, endExclusive }. */
function parseServicePeriod(text: string | null): { start: string; endExclusive: string } | null {
  if (!text) return null;
  const m = text
    .trim()
    .match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:,?\s*(\d{4}))?\s*[-–—]\s*([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s*(\d{4})$/);
  if (!m) return null;
  const sm = MONTHS[m[1].slice(0, 3).toLowerCase()];
  const em = MONTHS[m[4].slice(0, 3).toLowerCase()];
  if (!sm || !em) return null;
  const ey = Number(m[6]);
  const sy = m[3] ? Number(m[3]) : sm > em ? ey - 1 : ey;
  const start = `${sy}-${pad(sm)}-${pad(Number(m[2]))}`;
  const endInclusive = `${ey}-${pad(em)}-${pad(Number(m[5]))}`;
  return { start, endExclusive: addDaysISO(endInclusive, 1) };
}

/** "1 May – 31 Jul 2026", same style as the scheduled billing task. */
function formatPeriod(start: string, endExclusive: string): string {
  const last = addDaysISO(endExclusive, -1);
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ly, lm, ld] = last.split("-").map(Number);
  const a = `${sd} ${MON_LABEL[sm - 1]}${sy !== ly ? ` ${sy}` : ""}`;
  return `${a} – ${ld} ${MON_LABEL[lm - 1]} ${ly}`;
}

function normCycle(v: unknown): "monthly" | "quarterly" | null {
  const s = (str(v) ?? "").toLowerCase();
  if (["monthly", "month", "1", "m"].includes(s)) return "monthly";
  if (["quarterly", "quarter", "3", "q"].includes(s)) return "quarterly";
  return null;
}

async function runImport(): Promise<void> {
  if (!args.invoices) {
    console.error("import needs --invoices invoices.json");
    process.exit(1);
  }
  const userId = process.env.SYSTEMS_BILLING_USER_ID;
  if (!userId) {
    console.error("ERROR: SYSTEMS_BILLING_USER_ID is not set");
    process.exit(1);
  }
  const reportPath = args.report ?? "./systems-import-history-report.csv";
  const docs = loadEjsonArray(args.invoices);
  console.log(`Loaded ${docs.length} Mongo invoices from ${args.invoices}`);

  // ── Reference data ────────────────────────────────────────────────────────
  const org = must(
    await supabase.from("organizations").select("*").eq("id", orgId).maybeSingle(),
    "load organization",
  ) as Record<string, any> | null;
  if (!org || Array.isArray(org)) throw new Error(`organization ${orgId} not found`);
  const baseCurrency: string = org.base_currency;

  const member = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (member.error || !member.data) {
    throw new Error(`SYSTEMS_BILLING_USER_ID ${userId} is not a member of org ${orgId}`);
  }

  const tmplRes = await supabase
    .from("invoice_templates")
    .select("payment_terms, logo_url, date_format, include_tax, show_qty_column")
    .eq("org_id", orgId)
    .eq("is_default", true)
    .limit(1)
    .maybeSingle();
  const tmpl = (tmplRes.data ?? null) as Record<string, any> | null;

  const customers = await fetchAll<Record<string, any>>(
    (from, to) =>
      supabase
        .from("customers")
        .select("*")
        .eq("org_id", orgId)
        .eq("external_source", EXTERNAL_SOURCE)
        .not("external_id", "is", null)
        .range(from, to),
    "load linked customers",
  );
  const byClerk = new Map(customers.map((c) => [c.external_id as string, c]));

  const runs = await fetchAll<{ clerk_org_id: string; period_start: string }>(
    (from, to) =>
      supabase.from("systems_billing_runs").select("clerk_org_id, period_start").eq("org_id", orgId).range(from, to),
    "load billing runs",
  );
  const runKeys = new Set(runs.map((r) => `${r.clerk_org_id}|${r.period_start}`));

  const existingNumbers = new Set(
    (
      await fetchAll<{ invoice_number: string | null }>(
        (from, to) =>
          supabase.from("invoices").select("invoice_number").eq("org_id", orgId).not("invoice_number", "is", null).range(from, to),
        "load invoice numbers",
      )
    ).map((r) => (r.invoice_number ?? "").trim().toLowerCase()),
  );

  const rateCache = new Map<string, number | null>();
  async function reportingRate(currency: string): Promise<number | null> {
    if (rateCache.has(currency)) return rateCache.get(currency)!;
    const r = await supabase
      .from("exchange_rates")
      .select("rate")
      .eq("base", currency)
      .eq("target", baseCurrency)
      .maybeSingle();
    const v = r.data ? num((r.data as { rate: unknown }).rate) : null;
    rateCache.set(currency, v);
    return v;
  }

  const fromDetails = {
    name: org.name,
    logo_url: tmpl?.logo_url ?? org.logo_url ?? null,
    address_line1: org.address_line1 ?? null,
    address_line2: org.address_line2 ?? null,
    city: org.city ?? null,
    zip: org.zip ?? null,
    country_code: org.country_code ?? null,
    phone: org.phone ?? null,
    email: org.email ?? null,
    tax_id: org.tax_id ?? null,
  };

  // File-level duplicate detection (all occurrences are skipped).
  const numberCounts = new Map<string, number>();
  for (const d of docs) {
    const n = (str(d.invoice_number) ?? "").toLowerCase();
    if (n) numberCounts.set(n, (numberCounts.get(n) ?? 0) + 1);
  }
  const seenPeriods = new Set<string>();

  type Out = Record<string, unknown>;
  const out: Out[] = [];

  for (const d of docs) {
    const clerk = str(d.organizationId) ?? "";
    const number = str(d.invoice_number) ?? "";
    const row: Out = {
      clerk_org_id: clerk, invoice_number: number, customer: "", period_start: "", period_end: "",
      cycle: "", currency: str(d.currency) ?? "", total: "", status: "", notes: "", invoice_id: "",
    };
    const notes: string[] = [];
    const finish = (status: string) => {
      row.status = status;
      row.notes = notes.join("; ");
      out.push(row);
    };

    const customer = byClerk.get(clerk);
    if (!customer) {
      finish("not_linked");
      continue;
    }
    row.customer = customer.name;
    if (customer.is_archived) notes.push("customer is archived");

    const issueDate = toLocalDate(d.invoice_date);
    const servicePeriodText = str(d.service_period);
    const parsedSP = parseServicePeriod(servicePeriodText);
    let cycle = normCycle(d.billing_cycle);
    if (!issueDate || !number) {
      notes.push(!issueDate ? "invoice_date missing/unparseable" : "invoice_number missing");
      finish("invalid");
      continue;
    }
    if (!cycle && parsedSP) {
      const months = (Number(parsedSP.endExclusive.slice(0, 4)) * 12 + Number(parsedSP.endExclusive.slice(5, 7))) -
        (Number(parsedSP.start.slice(0, 4)) * 12 + Number(parsedSP.start.slice(5, 7)));
      cycle = months === 3 ? "quarterly" : months === 1 ? "monthly" : null;
      if (cycle) notes.push(`billing_cycle "${str(d.billing_cycle) ?? ""}" unrecognised, inferred ${cycle} from service_period`);
    }
    if (!cycle) {
      notes.push(`unknown billing_cycle "${str(d.billing_cycle) ?? ""}"`);
      finish("invalid");
      continue;
    }

    const periodEnd = `${issueDate.slice(0, 7)}-01`;
    const periodStart = addMonthsISO(periodEnd, cycle === "quarterly" ? -3 : -1);
    row.period_start = periodStart;
    row.period_end = periodEnd;
    row.cycle = cycle;

    if (parsedSP) {
      if (parsedSP.start !== periodStart || parsedSP.endExclusive !== periodEnd) {
        notes.push(
          `PERIOD MISMATCH: service_period "${servicePeriodText}" = ${parsedSP.start}..${parsedSP.endExclusive}, derived ${periodStart}..${periodEnd}`,
        );
      }
    } else {
      notes.push(`service_period "${servicePeriodText ?? ""}" not parseable; not cross-checked`);
    }

    const amountBilled = num(d.amount_billed);
    const currency = (str(d.currency) ?? "").toUpperCase();
    if (amountBilled === null || amountBilled < 0 || !/^[A-Z]{3}$/.test(currency)) {
      notes.push("amount_billed or currency invalid");
      finish("invalid");
      continue;
    }
    const total = round2(amountBilled);
    row.total = total;
    row.currency = currency;

    const runKey = `${clerk}|${periodStart}`;
    if (runKeys.has(runKey)) {
      finish("already_imported");
      continue;
    }
    if ((numberCounts.get(number.toLowerCase()) ?? 0) > 1) {
      notes.push("invoice_number appears more than once in the file; all copies skipped, dedupe by hand");
      finish("duplicate_number");
      continue;
    }
    if (existingNumbers.has(number.toLowerCase())) {
      notes.push("invoice_number already exists in the Books org");
      finish("duplicate_number");
      continue;
    }
    if (seenPeriods.has(runKey)) {
      notes.push("another invoice in the file covers the same client and period");
      finish("duplicate_period");
      continue;
    }
    seenPeriods.add(runKey);

    // ── Build the invoice row ───────────────────────────────────────────────
    const vehicles = num(d.vehicle_count);
    const periodText = formatPeriod(periodStart, periodEnd);
    const description = `Fleet management · ${periodText} (${cycle}) · ${vehicles ?? "?"} vehicles`;
    const sentAt = str(d.sent_at) ?? `${issueDate}T00:00:00Z`;
    const terms = typeof tmpl?.payment_terms === "number" ? tmpl.payment_terms : null;

    let exchangeRate: number | null;
    let converted: number | null;
    if (currency === baseCurrency) {
      exchangeRate = 1;
      converted = total;
    } else {
      exchangeRate = await reportingRate(currency);
      converted = exchangeRate === null ? null : round2(total * exchangeRate);
      if (exchangeRate === null) notes.push(`no exchange_rates row ${currency}->${baseCurrency}; reporting FX left null`);
    }

    const customerDetails = {
      name: customer.name,
      email: customer.email ?? null,
      billing_email: customer.billing_email ?? null,
      billing_cc: customer.billing_cc ?? null,
      phone: customer.phone ?? null,
      address_line1: customer.address_line1 ?? null,
      address_line2: customer.address_line2 ?? null,
      city: customer.city ?? null,
      zip: customer.zip ?? null,
      country: customer.country ?? null,
    };

    const invoiceRow = {
      org_id: orgId,
      user_id: userId,
      customer_id: customer.id,
      customer_name: customer.name,
      invoice_number: number,
      status: "unpaid",
      imported_number: true,
      skip_auto_reminder: true,
      // The owner overdue alert (notify-invoice-overdue) selects unpaid rows
      // past due with this column null; stamp it so history doesn't page the owner.
      overdue_alert_sent_at: new Date().toISOString(),
      currency,
      issue_date: issueDate,
      due_date: terms === null ? null : addDaysISO(issueDate, terms),
      sent_at: sentAt,
      sent_via: "email",
      delivery_type: "email",
      line_items: [{ description, quantity: 1, price: total, tax_rate: 0 }],
      subtotal: total,
      tax_amount: 0,
      discount: 0,
      total,
      from_details: fromDetails,
      customer_details: customerDetails,
      accept_payments: false,
      invoice_template: "classic",
      date_format: tmpl?.date_format ?? "DD/MM/YYYY",
      show_tax_column: false,
      show_qty_column: tmpl?.show_qty_column ?? true,
      base_currency: baseCurrency,
      exchange_rate: exchangeRate,
      converted_amount: converted,
      internal_note: `Imported from Travada Systems (n8n). Original PDF: ${str(d.pdf_url) ?? "n/a"}`,
    };

    const runRow = {
      org_id: orgId,
      customer_id: customer.id,
      clerk_org_id: clerk,
      period_start: periodStart,
      period_end: periodEnd,
      cycle,
      source: "legacy_import",
      vehicle_count: vehicles === null ? null : Math.trunc(vehicles),
      usd_total: num(d.amount_usd),
      currency,
      fx_rate: num(d.exchange_rate),
      snapshot: d,
    };

    if (!args.apply) {
      finish("would_import");
      continue;
    }

    // ── Apply: invoice, then run row; undo the invoice if the run fails ──────
    const ins = await supabase.from("invoices").insert(invoiceRow).select("id").single();
    if (ins.error) {
      notes.push(`invoice insert failed: ${ins.error.message}`);
      finish("error");
      continue;
    }
    const invoiceId = ins.data.id as string;
    const runIns = await supabase.from("systems_billing_runs").insert({ ...runRow, invoice_id: invoiceId });
    if (runIns.error) {
      const del = await supabase.from("invoices").delete().eq("id", invoiceId);
      notes.push(
        `run insert failed (${runIns.error.code ?? ""} ${runIns.error.message}); ` +
          (del.error ? `ROLLBACK FAILED, delete invoice ${invoiceId} by hand: ${del.error.message}` : "invoice rolled back"),
      );
      finish(runIns.error.code === "23505" ? "already_imported" : "error");
      continue;
    }
    runKeys.add(runKey);
    existingNumbers.add(number.toLowerCase());
    row.invoice_id = invoiceId;
    finish("imported");
  }

  const cols = ["clerk_org_id", "invoice_number", "customer", "period_start", "period_end", "cycle", "currency", "total", "status", "invoice_id", "notes"];
  writeCsv(reportPath, cols, out);
  printCounts(args.apply ? "Import results" : "Import plan (dry run)", out.map((r) => String(r.status)));
  const flagged = out.filter((r) => /MISMATCH/.test(String(r.notes))).length;
  if (flagged) console.log(`\n${flagged} invoice(s) have a service_period mismatch, see the notes column.`);
  console.log(`\nReport written to ${reportPath}`);
  if (!args.apply) console.log("Dry run: nothing was written. Re-run with --apply to write.");
  if (out.some((r) => r.status === "error")) process.exitCode = 1;
}

// ════════════════════════════════════════════════════════════════════════════
// match
// ════════════════════════════════════════════════════════════════════════════

const PAYMENT_MODES = new Set(["mpesa", "bank_transfer", "cash", "cheque", "card", "other"]);

type Invoice = {
  id: string; org_id: string; customer_id: string | null; customer_name: string | null; invoice_number: string | null;
  total: number; amount_paid: number; currency: string; issue_date: string | null; status: string; imported_number: boolean;
};
type Txn = {
  id: string; org_id: string; date: string; amount: number; currency: string; type: string; counterparty_name: string | null;
  customer_id: string | null; invoice_id: string | null; invoice_payment_id: string | null; payment_mode: string | null;
  reference_number: string | null; name: string | null;
};

const NAME_NOISE = new Set(["ltd", "limited", "co", "company", "inc", "llc", "plc", "the", "and", "kenya", "ke"]);
function nameTokens(s: string | null | undefined): string[] {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((t) => t && !NAME_NOISE.has(t));
}
/** 3 exact, 2 containment, 1 token overlap >= 50%, 0 otherwise. */
function nameScore(a: string | null | undefined, b: string | null | undefined): number {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (!ta.length || !tb.length) return 0;
  const sa = ta.join(" ");
  const sb = tb.join(" ");
  if (sa === sb) return 3;
  if (sa.includes(sb) || sb.includes(sa)) return 2;
  const setB = new Set(tb);
  const inter = ta.filter((t) => setB.has(t)).length;
  return inter / new Set([...ta, ...tb]).size >= 0.5 ? 1 : 0;
}
const dayDiff = (a: string, b: string) => Math.abs((Date.parse(a) - Date.parse(b)) / 86_400_000);

async function countTxns(): Promise<number> {
  const r = await supabase.from("transactions").select("id", { count: "exact", head: true }).eq("org_id", orgId);
  if (r.error) throw new Error(`count transactions: ${r.error.message}`);
  return r.count ?? 0;
}

async function runMatch(): Promise<void> {
  if (args["apply-from"]) await applyMatches(args["apply-from"]);
  else await proposeMatches();
}

async function proposeMatches(): Promise<void> {
  const reportPath = args.report ?? "./systems-match-candidates.csv";
  const invoices = (
    await fetchAll<Invoice>(
      (from, to) =>
        supabase
          .from("invoices")
          .select("id, org_id, customer_id, customer_name, invoice_number, total, amount_paid, currency, issue_date, status, imported_number")
          .eq("org_id", orgId)
          .eq("imported_number", true)
          .neq("status", "canceled")
          .neq("status", "draft")
          .order("issue_date")
          .range(from, to),
      "load imported invoices",
    )
  ).filter((i) => Number(i.amount_paid) < Number(i.total));
  console.log(`${invoices.length} imported invoice(s) with an outstanding balance`);

  const txns = await fetchAll<Txn>(
    (from, to) =>
      supabase
        .from("transactions")
        .select("id, org_id, date, amount, currency, type, counterparty_name, customer_id, invoice_id, invoice_payment_id, payment_mode, reference_number, name")
        .eq("org_id", orgId)
        .eq("type", "income")
        .is("invoice_id", null)
        .is("invoice_payment_id", null)
        .order("date")
        .range(from, to),
    "load candidate transactions",
  );
  console.log(`${txns.length} unlinked income transaction(s) in the org`);

  type Cand = { txn: Txn; custMatch: boolean; nameSc: number; days: number };
  type Item = { inv: Invoice; cands: Cand[] };
  const items: Item[] = invoices.map((inv) => {
    const outstanding = round2(Number(inv.total) - Number(inv.amount_paid));
    const issue = inv.issue_date ?? "";
    const minDate = issue ? addDaysISO(issue, -7) : "";
    const cands = txns
      .filter((t) => t.currency === inv.currency && Math.abs(Number(t.amount) - outstanding) <= 0.01 && (!minDate || t.date >= minDate))
      .map((t) => ({
        txn: t,
        custMatch: Boolean(inv.customer_id && t.customer_id === inv.customer_id),
        nameSc: nameScore(t.counterparty_name ?? t.name, inv.customer_name),
        days: issue ? dayDiff(t.date, issue) : 0,
      }))
      .sort((a, b) => Number(b.custMatch) - Number(a.custMatch) || b.nameSc - a.nameSc || a.days - b.days);
    return { inv, cands };
  });

  // A transaction that is the only candidate for several invoices is not unique.
  const uniqueUse = new Map<string, number>();
  for (const it of items) if (it.cands.length === 1) uniqueUse.set(it.cands[0].txn.id, (uniqueUse.get(it.cands[0].txn.id) ?? 0) + 1);

  const rows: Record<string, unknown>[] = [];
  const conf: string[] = [];
  for (const it of items) {
    const base = {
      invoice_id: it.inv.id, invoice_number: it.inv.invoice_number, customer: it.inv.customer_name,
      total: it.inv.total, outstanding: round2(Number(it.inv.total) - Number(it.inv.amount_paid)), currency: it.inv.currency,
    };
    if (it.cands.length === 0) {
      conf.push("none");
      rows.push({ ...base, candidate_transaction_id: "", txn_date: "", txn_amount: "", counterparty: "", customer_match: "", confidence: "none", approve: "" });
      continue;
    }
    const isUnique = it.cands.length === 1 && uniqueUse.get(it.cands[0].txn.id) === 1;
    const confidence = isUnique ? "unique" : "multiple";
    conf.push(confidence);
    for (const c of it.cands.slice(0, 5)) {
      const custOk = c.custMatch || c.nameSc >= 2;
      rows.push({
        ...base, candidate_transaction_id: c.txn.id, txn_date: c.txn.date, txn_amount: c.txn.amount,
        counterparty: c.txn.counterparty_name ?? c.txn.name ?? "", customer_match: c.custMatch ? "customer_id" : c.nameSc >= 2 ? "name" : "no",
        confidence, approve: isUnique && custOk ? "yes" : "",
      });
    }
  }
  const cols = ["invoice_id", "invoice_number", "customer", "total", "outstanding", "currency", "candidate_transaction_id", "txn_date", "txn_amount", "counterparty", "customer_match", "confidence", "approve"];
  writeCsv(reportPath, cols, rows);
  printCounts("Match confidence per invoice", conf);
  console.log(`\nPre-approved (approve=yes): ${rows.filter((r) => r.approve === "yes").length}`);
  console.log(`Candidates written to ${reportPath}`);
  console.log("Review it. For 'multiple' invoices set approve=yes on exactly ONE row. Then run: match --apply-from <file>");
}

async function applyMatches(path: string): Promise<void> {
  const reportPath = args.report ?? "./systems-match-applied-report.csv";
  const approved = readCsv(path).filter((r) => (r.approve ?? "").toLowerCase() === "yes");
  console.log(`${approved.length} approved row(s) in ${path}`);

  const before = await countTxns();
  console.log(`Transactions in org BEFORE: ${before}`);

  const out: Record<string, unknown>[] = [];
  const usedTxn = new Set<string>();

  for (const r of approved) {
    const invoiceId = r.invoice_id;
    const txnId = r.candidate_transaction_id;
    const res: Record<string, unknown> = {
      invoice_id: invoiceId, invoice_number: r.invoice_number, transaction_id: txnId, amount: "", status: "", invoice_status_after: "", notes: "",
    };
    const done = (status: string, note?: string) => {
      res.status = status;
      if (note) res.notes = note;
      out.push(res);
    };

    if (!invoiceId || !txnId) { done("skipped", "row missing invoice_id or candidate_transaction_id"); continue; }
    if (usedTxn.has(txnId)) { done("skipped", "transaction approved for more than one invoice in this file"); continue; }

    const invRes = await supabase
      .from("invoices")
      .select("id, org_id, total, amount_paid, currency, status, imported_number")
      .eq("id", invoiceId).eq("org_id", orgId).maybeSingle();
    const txnRes = await supabase
      .from("transactions")
      .select("id, org_id, date, amount, currency, type, invoice_id, invoice_payment_id, payment_mode, reference_number")
      .eq("id", txnId).eq("org_id", orgId).maybeSingle();
    const inv = invRes.data as Invoice | null;
    const txn = txnRes.data as Txn | null;

    if (!inv || !txn) { done("skipped", "invoice or transaction not found in this org"); continue; }
    if (!inv.imported_number) { done("skipped", "invoice is not an imported one"); continue; }
    if (inv.status === "canceled" || inv.status === "draft") { done("skipped", `invoice status is ${inv.status}`); continue; }
    if (txn.type !== "income") { done("skipped", "transaction is not income"); continue; }
    if (txn.invoice_id || txn.invoice_payment_id) { done("skipped", "transaction is already linked"); continue; }
    if (txn.currency !== inv.currency) { done("skipped", `currency mismatch ${txn.currency} vs ${inv.currency}`); continue; }

    const outstanding = round2(Number(inv.total) - Number(inv.amount_paid));
    const amount = Number(txn.amount);
    res.amount = amount;
    if (outstanding <= 0) { done("skipped", "invoice has no outstanding balance"); continue; }
    if (Math.abs(amount - outstanding) > 0.01) { done("skipped", `amount ${amount} no longer matches outstanding ${outstanding}`); continue; }

    const method = txn.payment_mode && PAYMENT_MODES.has(txn.payment_mode) ? txn.payment_mode : "other";
    const note = Math.abs(amount - outstanding) > 0 ? `amount differs from outstanding by ${round2(outstanding - amount)}` : "";

    // Insert the ledger row WITH transaction_id: sync_payment_transaction()
    // then creates nothing. It never goes in without one.
    const pay = await supabase
      .from("invoice_payments")
      .insert({
        org_id: orgId, invoice_id: inv.id, amount, currency: txn.currency, paid_at: `${txn.date}T12:00:00Z`,
        method, source: "manual", note: "Linked to existing transaction (n8n import)",
        reference: txn.reference_number ?? null, transaction_id: txn.id,
        recorded_by: process.env.SYSTEMS_BILLING_USER_ID ?? null,
      })
      .select("id").single();
    if (pay.error) { done("error", `payment insert failed: ${pay.error.message}`); continue; }

    const upd = await supabase
      .from("transactions")
      .update({ invoice_id: inv.id, invoice_payment_id: pay.data.id })
      .eq("id", txn.id).eq("org_id", orgId).is("invoice_id", null).is("invoice_payment_id", null)
      .select("id");
    if (upd.error || !upd.data || upd.data.length === 0) {
      const del = await supabase.from("invoice_payments").delete().eq("id", pay.data.id);
      done("error", `transaction link failed (${upd.error?.message ?? "no row updated"}); ` + (del.error ? `ROLLBACK FAILED, delete invoice_payments ${pay.data.id} by hand` : "payment rolled back"));
      continue;
    }
    usedTxn.add(txnId);

    const after = await supabase.from("invoices").select("status, amount_paid").eq("id", inv.id).single();
    res.invoice_status_after = after.data ? `${after.data.status} (paid ${after.data.amount_paid}/${inv.total})` : "?";
    done("linked", note);
  }

  const afterCount = await countTxns();
  console.log(`Transactions in org AFTER : ${afterCount}`);
  const equal = afterCount === before;
  console.log(equal ? "OK: transaction count unchanged, no new revenue was created." : `!! TRANSACTION COUNT CHANGED (${before} -> ${afterCount}). Investigate immediately.`);

  writeCsv(reportPath, ["invoice_id", "invoice_number", "transaction_id", "amount", "status", "invoice_status_after", "notes"], out);
  printCounts("Link results", out.map((r) => String(r.status)));
  console.log(`\nReport written to ${reportPath}`);
  if (!equal || out.some((r) => r.status === "error")) process.exitCode = 1;
}

// ── Dispatch (last, so every module-level const above is initialised) ───────
if (sub === "import") await runImport();
else await runMatch();
