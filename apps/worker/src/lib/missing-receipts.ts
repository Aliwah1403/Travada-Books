import type { SupabaseClient } from "@supabase/supabase-js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const PAGE = 1000;
const MAX_ROWS_PER_ORG = 5000;
const IN_CHUNK = 150;

export const LOOKBACK_DAYS = 30;
export const NEW_WINDOW_DAYS = 7;
export const SHOWN_LIMIT = 5;

// Categories where a receipt normally doesn't exist. Uncategorized still counts.
export const NO_RECEIPT_SLUGS = [
  "bank-charges-fees",
  "salaries-wages",
  "taxes-levies",
  "loan-repayment",
  "depreciation",
] as const;

export type MissingReceiptRow = {
  id: string;
  date: string;
  name: string;
  amount: number;
  currency: string;
};

export type OrgMissingReceipts = {
  orgId: string;
  missingCount: number;
  newThisWeek: number;
  /** Newest first, at most SHOWN_LIMIT. */
  shown: MissingReceiptRow[];
};

type Row = MissingReceiptRow & { category_id: string | null; created_at: string };

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Shared filter for "expense that still wants a receipt", before category and
// suggestion exclusions (those need lookups). `internal` is nullable, so a plain
// .neq("internal", true) would drop NULL rows; hence the explicit or().
function baseQuery(supabase: SupabaseClient, select: string, dateFloor: string) {
  return supabase
    .from("transactions")
    .select(select)
    .eq("type", "expense")
    .eq("status", "completed")
    .eq("has_attachments", false)
    .or("internal.is.null,internal.eq.false")
    .is("invoice_payment_id", null)
    .gte("date", dateFloor);
}

async function excludedCategoryIds(supabase: SupabaseClient, orgIds: string[]): Promise<Set<string>> {
  const ids = new Set<string>();
  for (const part of chunk(orgIds, IN_CHUNK)) {
    const { data, error } = await supabase
      .from("transaction_categories")
      .select("id")
      .in("org_id", part)
      .in("slug", [...NO_RECEIPT_SLUGS]);
    if (error) throw new Error(`categories query failed: ${error.message}`);
    for (const r of data ?? []) ids.add(r.id as string);
  }
  return ids;
}

async function pendingSuggestionTxIds(supabase: SupabaseClient, txIds: string[]): Promise<Set<string>> {
  const ids = new Set<string>();
  for (const part of chunk(txIds, IN_CHUNK)) {
    const { data, error } = await supabase
      .from("transaction_match_suggestions")
      .select("transaction_id")
      .eq("status", "pending")
      .in("transaction_id", part);
    if (error) throw new Error(`suggestions query failed: ${error.message}`);
    for (const r of data ?? []) ids.add(r.transaction_id as string);
  }
  return ids;
}

async function loadOrgMissing(
  supabase: SupabaseClient,
  orgId: string,
  excluded: Set<string>,
  dateFloor: string,
  newSince: string,
): Promise<{ kept: Row[]; newThisWeek: number }> {
  const rows: Row[] = [];
  for (let from = 0; from < MAX_ROWS_PER_ORG; from += PAGE) {
    const { data, error } = await baseQuery(supabase, "id, date, name, amount, currency, category_id, created_at", dateFloor)
      .eq("org_id", orgId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`org ${orgId} list failed: ${error.message}`);
    const page = (data ?? []) as unknown as Row[];
    rows.push(...page);
    if (page.length < PAGE) break;
  }

  const orgPending = await pendingSuggestionTxIds(supabase, rows.map((r) => r.id));
  const kept = rows.filter((r) => !(r.category_id && excluded.has(r.category_id)) && !orgPending.has(r.id));
  const newThisWeek = kept.filter((r) => r.created_at >= newSince).length;
  return { kept, newThisWeek };
}

/**
 * Missing-receipt count for one org, same definition as the weekly nudge
 * (30-day window ending at `now`, excluded categories and pending match
 * suggestions removed). Used by the weekly insight.
 */
export async function countMissingReceipts(
  supabase: SupabaseClient,
  orgId: string,
  now: Date = new Date(),
): Promise<number> {
  const dateFloor = isoDate(new Date(now.getTime() - LOOKBACK_DAYS * MS_PER_DAY));
  const newSince = new Date(now.getTime() - NEW_WINDOW_DAYS * MS_PER_DAY).toISOString();
  const excluded = await excludedCategoryIds(supabase, [orgId]);
  const { kept } = await loadOrgMissing(supabase, orgId, excluded, dateFloor, newSince);
  return kept.length;
}

/**
 * Orgs with at least one missing receipt that was created in the last 7 days,
 * plus the full missing list (last 30 days) for those orgs.
 *
 * Step 1 only scans rows created in the last 7 days (bounded), not every org's
 * full history; step 2 loads the 30-day list for the qualifying orgs only.
 */
export async function findOrgsWithMissingReceipts(
  supabase: SupabaseClient,
  now: Date = new Date(),
): Promise<OrgMissingReceipts[]> {
  const dateFloor = isoDate(new Date(now.getTime() - LOOKBACK_DAYS * MS_PER_DAY));
  const newSince = new Date(now.getTime() - NEW_WINDOW_DAYS * MS_PER_DAY).toISOString();

  // Step 1: candidate rows created this week -> distinct org ids.
  const fresh: { id: string; org_id: string; category_id: string | null }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await baseQuery(supabase, "id, org_id, category_id", dateFloor)
      .gte("created_at", newSince)
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`candidate query failed: ${error.message}`);
    const rows = (data ?? []) as unknown as typeof fresh;
    fresh.push(...rows);
    if (rows.length < PAGE) break;
  }
  if (!fresh.length) return [];

  const candidateOrgs = [...new Set(fresh.map((r) => r.org_id))];
  const excluded = await excludedCategoryIds(supabase, candidateOrgs);
  const pending = await pendingSuggestionTxIds(supabase, fresh.map((r) => r.id));
  const qualifying = [
    ...new Set(
      fresh
        .filter((r) => !(r.category_id && excluded.has(r.category_id)) && !pending.has(r.id))
        .map((r) => r.org_id),
    ),
  ];

  // Step 2: the full 30-day list for each qualifying org.
  const result: OrgMissingReceipts[] = [];
  for (const orgId of qualifying) {
    const org = await loadOrgMissing(supabase, orgId, excluded, dateFloor, newSince);
    if (!org.kept.length || org.newThisWeek === 0) continue;
    result.push({
      orgId,
      missingCount: org.kept.length,
      newThisWeek: org.newThisWeek,
      shown: org.kept.slice(0, SHOWN_LIMIT).map(({ id, date, name, amount, currency }) => ({ id, date, name, amount, currency })),
    });
  }
  return result;
}

/**
 * Transactions page deep link. `filters` is the exact JSON the page's
 * serializeFilters/deserializeFilters use: type = expense, status = completed,
 * Has Attachment = false. (The 30-day window and excluded categories are not
 * expressible as page filters, so the page count can be slightly higher.)
 */
export function buildMissingReceiptsUrl(appUrl: string): string {
  const filters = JSON.stringify([
    { columnId: "type", type: "option", operator: "is", values: ["expense"] },
    { columnId: "status", type: "option", operator: "is", values: ["completed"] },
    { columnId: "hasAttachment", type: "boolean", operator: "is", values: [false] },
  ]);
  return `${appUrl}/transactions?filters=${encodeURIComponent(filters)}&from=receipt-nudge`;
}

/** Org's receipts inbox address; mirrors getInboxEmail in apps/app/src/lib/queries/inbox.ts. */
export function inboxAddress(inboxId: string | null | undefined): string | null {
  return inboxId ? `${inboxId}@inbox.travadabooks.com` : null;
}
