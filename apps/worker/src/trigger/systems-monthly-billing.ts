import { schedules, task, logger, AbortTaskRunError } from "@trigger.dev/sdk";
import { supabase } from "../lib/supabase";
import {
  customerPatch,
  isFxFresh,
  linesTotalCents,
  centsToDecimal,
  parseBillingResponse,
  toInvoiceLines,
  type BillableOrg,
} from "../lib/systems-billing";

type Source = "scheduled" | "manual";

type DraftedItem = {
  clerkOrgId: string;
  customerName: string;
  invoiceId: string;
  invoiceNumber: string;
  total: string;
  currency: string;
};
type AlreadyBilledItem = {
  clerkOrgId: string;
  customerName: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  total: string;
  currency: string;
};
type ReasonItem = { clerkOrgId: string; customerName?: string; reason: string };

export type SystemsBillingSummary = {
  billingDate: string;
  source: Source;
  drafted: DraftedItem[];
  alreadyBilled: AlreadyBilledItem[];
  skipped: ReasonItem[];
  errors: ReasonItem[];
};

const REQUIRED_ENV = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "WORKER_SHARED_SECRET",
  "SYSTEMS_BOOKS_ORG_ID",
  "SYSTEMS_BILLING_USER_ID",
  "SYSTEMS_API_URL",
  "SYSTEMS_BILLING_API_SECRET",
] as const;

function readEnv(): Record<(typeof REQUIRED_ENV)[number], string> {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new AbortTaskRunError(`Systems billing: missing env var(s): ${missing.join(", ")}`);
  }
  return Object.fromEntries(REQUIRED_ENV.map((k) => [k, process.env[k]!])) as Record<
    (typeof REQUIRED_ENV)[number],
    string
  >;
}

/** Calendar date (YYYY-MM-DD) of an instant in Asia/Dubai. */
function dubaiDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

async function fetchBilling(env: ReturnType<typeof readEnv>, billingDate: string) {
  const url = `${env.SYSTEMS_API_URL.replace(/\/+$/, "")}/internal/books/billing?date=${encodeURIComponent(billingDate)}`;
  // Network errors and 5xx throw plain errors so Trigger retries the whole run (nothing written yet).
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${env.SYSTEMS_BILLING_API_SECRET}`, Accept: "application/json" },
    signal: AbortSignal.timeout(60_000),
  });
  if (res.status >= 500) throw new Error(`Systems billing endpoint returned ${res.status}`);
  if (!res.ok) {
    throw new AbortTaskRunError(
      `Systems billing endpoint rejected the request (${res.status}). Check SYSTEMS_BILLING_API_SECRET and the date ${billingDate}.`,
    );
  }
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error("Systems billing endpoint returned a non-JSON body");
  }
  try {
    return parseBillingResponse(json);
  } catch (err) {
    throw new AbortTaskRunError(
      `Systems billing response has an invalid envelope: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export async function runSystemsBilling(opts: {
  billingDate: string;
  source: Source;
  onlyClerkOrgIds?: string[];
  /** Local rehearsal only: never contact notification providers. */
  notify?: boolean;
}): Promise<SystemsBillingSummary> {
  const { billingDate, source, onlyClerkOrgIds } = opts;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(billingDate)) {
    throw new AbortTaskRunError(`Invalid billingDate "${billingDate}", expected YYYY-MM-DD`);
  }
  const env = readEnv();
  if (opts.notify === false) {
    for (const url of [env.SUPABASE_URL, env.SYSTEMS_API_URL]) {
      if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname)) {
        throw new AbortTaskRunError("Notifications may only be suppressed during a local rehearsal");
      }
    }
  }
  logger.log("Systems billing: starting", { billingDate, source, onlyClerkOrgIds });

  const response = await fetchBilling(env, billingDate);

  const summary: SystemsBillingSummary = {
    billingDate,
    source,
    drafted: [],
    alreadyBilled: [],
    skipped: [],
    errors: [],
  };
  const only = onlyClerkOrgIds?.length ? new Set(onlyClerkOrgIds) : null;

  for (const { org, raw } of response.orgs) {
    if (only && !only.has(org.clerk_org_id)) continue;

    if (org.status === "skipped") {
      summary.skipped.push({ clerkOrgId: org.clerk_org_id, reason: org.reason });
      continue;
    }
    if (org.status === "error") {
      summary.errors.push({ clerkOrgId: org.clerk_org_id, reason: org.reason });
      continue;
    }

    try {
      await processOrg(env, org, raw, billingDate, source, summary);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      logger.error("Systems billing: org failed", { clerkOrgId: org.clerk_org_id, reason });
      summary.errors.push({ clerkOrgId: org.clerk_org_id, customerName: org.customer.name ?? undefined, reason });
    }
  }

  if (opts.notify !== false) await notify(env, summary);

  logger.log("Systems billing: complete", {
    billingDate,
    drafted: summary.drafted.length,
    alreadyBilled: summary.alreadyBilled.length,
    skipped: summary.skipped.length,
    errors: summary.errors.length,
  });
  return summary;
}

async function processOrg(
  env: ReturnType<typeof readEnv>,
  org: BillableOrg,
  raw: unknown,
  billingDate: string,
  source: Source,
  summary: SystemsBillingSummary,
) {
  const clerkOrgId = org.clerk_org_id;

  // a. Find the linked customer.
  const { data: customer, error: custErr } = await supabase
    .from("customers")
    .select("id, name, is_archived")
    .eq("org_id", env.SYSTEMS_BOOKS_ORG_ID)
    .eq("external_source", "travada_systems")
    .eq("external_id", clerkOrgId)
    .maybeSingle();
  if (custErr) throw new Error(`customer lookup failed: ${custErr.message}`);
  if (!customer) {
    summary.skipped.push({ clerkOrgId, customerName: org.customer.name ?? undefined, reason: "not_linked" });
    return;
  }
  const customerName = (customer.name as string) || org.customer.name || clerkOrgId;
  if (customer.is_archived) {
    summary.skipped.push({ clerkOrgId, customerName, reason: "archived" });
    return;
  }

  // b. FX.
  let fx: { rate: number; updatedAt: string } | null = null;
  if (org.currency !== "USD") {
    const { data: rateRow, error: fxErr } = await supabase
      .from("exchange_rates")
      .select("rate, updated_at")
      .eq("base", "USD")
      .eq("target", org.currency)
      .maybeSingle();
    if (fxErr) throw new Error(`exchange rate lookup failed: ${fxErr.message}`);
    const rate = rateRow ? Number(rateRow.rate) : NaN;
    if (!rateRow || !Number.isFinite(rate) || rate <= 0 || !isFxFresh(rateRow.updated_at as string, new Date())) {
      summary.skipped.push({ clerkOrgId, customerName, reason: "no_fx_rate" });
      return;
    }
    fx = { rate, updatedAt: rateRow.updated_at as string };
  }

  // c. Refresh synced customer fields (never blanks a filled field).
  const patch = customerPatch(org.customer, org.currency);
  if (Object.keys(patch).length > 0) {
    const { error: updErr } = await supabase
      .from("customers")
      .update(patch)
      .eq("id", customer.id)
      .eq("org_id", env.SYSTEMS_BOOKS_ORG_ID);
    if (updErr) throw new Error(`customer update failed: ${updErr.message}`);
  }

  // d. Create the draft.
  const lines = toInvoiceLines(org, fx ? { rate: fx.rate } : null);
  const { data: result, error: rpcErr } = await supabase.rpc("create_systems_billing_draft", {
    p: {
      org_id: env.SYSTEMS_BOOKS_ORG_ID,
      customer_id: customer.id,
      user_id: env.SYSTEMS_BILLING_USER_ID,
      clerk_org_id: clerkOrgId,
      period_start: org.period_start,
      period_end: org.period_end,
      cycle: org.cycle,
      source,
      issue_date: billingDate,
      currency: org.currency,
      line_items: lines,
      vehicle_count: org.vehicle_count,
      counted_at: org.counted_at,
      usd_rate: org.usd_rate,
      discount_pct: org.discount_eligible ? (org.discount_percent ?? 0) : 0,
      usd_total: org.total_usd,
      fx_rate: fx ? fx.rate : null,
      fx_rate_at: fx ? fx.updatedAt : null,
      snapshot: raw,
    },
  });
  if (rpcErr) throw new Error(`create_systems_billing_draft failed: ${rpcErr.message}`);

  const out = result as { invoice_id: string | null; invoice_number: string | null; created: boolean } | null;
  if (!out) throw new Error("create_systems_billing_draft returned nothing");

  const total = centsToDecimal(linesTotalCents(lines));

  // e. Record the outcome.
  if (!out.created) {
    summary.alreadyBilled.push({
      clerkOrgId,
      customerName,
      invoiceId: out.invoice_id,
      invoiceNumber: out.invoice_number,
      total,
      currency: org.currency,
    });
    return;
  }
  summary.drafted.push({
    clerkOrgId,
    customerName,
    invoiceId: out.invoice_id as string,
    invoiceNumber: out.invoice_number as string,
    total,
    currency: org.currency,
  });
}

async function notify(env: ReturnType<typeof readEnv>, summary: SystemsBillingSummary) {
  try {
    const res = await fetch(`${env.SUPABASE_URL}/functions/v1/notify-systems-billing`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "X-Worker-Secret": env.WORKER_SHARED_SECRET,
      },
      body: JSON.stringify(summary),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      logger.error("Systems billing: notification failed", { status: res.status, body: (await res.text()).slice(0, 500) });
    }
  } catch (err) {
    logger.error("Systems billing: notification threw", { error: err instanceof Error ? err.message : String(err) });
  }
}

const retry = {
  maxAttempts: 3,
  minTimeoutInMs: 30_000,
  maxTimeoutInMs: 300_000,
  factor: 3,
  randomize: true,
};

export const systemsMonthlyBilling = schedules.task({
  id: "systems-monthly-billing",
  cron: { pattern: "0 8 1 * *", timezone: "Asia/Dubai", environments: ["PRODUCTION"] },
  maxDuration: 900,
  queue: { concurrencyLimit: 1 },
  retry,
  run: async (payload) => {
    // The scheduled instant, not wall-clock time: a retry must bill the same period.
    const billingDate = dubaiDate(payload.timestamp);
    return runSystemsBilling({ billingDate, source: "scheduled" });
  },
});

export const systemsBillingRun = task({
  id: "systems-billing-run",
  maxDuration: 900,
  queue: { concurrencyLimit: 1 },
  retry,
  run: async (payload: { billingDate: string; onlyClerkOrgIds?: string[] }) => {
    return runSystemsBilling({
      billingDate: payload.billingDate,
      source: "manual",
      onlyClerkOrgIds: payload.onlyClerkOrgIds,
    });
  },
});
