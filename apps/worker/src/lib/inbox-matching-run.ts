import { logger } from "@trigger.dev/sdk";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  scoreCandidate,
  rankCandidates,
  classifyTier,
  isMerchantAutoMatchEligible,
  calibrateSuggestedThreshold,
  CALIBRATION_LIMITS,
  type InboxItemForScoring,
  type TransactionCandidate,
  type ScoredCandidate,
  type MatchTier,
} from "./inbox-matching";
import { notifyInbox } from "./notify-inbox";

// Inbox Batch 3b/3h — the matching engine's orchestration body, shared by both
// match-inbox-transactions.ts (forward: new inbox item -> find its transaction)
// and batch-match-inbox.ts (reverse: new transaction -> recheck stale no_match
// inbox items). All scoring math lives in ./inbox-matching.ts (pure,
// unit-testable); this module owns the DB reads/writes around it.

export function getSupabase(): SupabaseClient {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

// How many ranked candidates get a written suggestion row (beyond the winner)
// when the top candidate isn't an auto-match. Keeps the suggestion list from
// growing unbounded — INBOX-PLAN 3d says "every candidate above the floor"
// but doesn't cap it; a reasonable cap avoids a noisy inbox detail pane later.
const MAX_SUGGESTIONS_PER_ITEM = 5;

// Candidate-search fallback window (no embedding available) — wide enough to
// cover Net-90 payment terms plus decay on either side.
const FALLBACK_DATE_WINDOW_DAYS = 100;
const FALLBACK_AMOUNT_TOLERANCE = 0.3; // ±30%, wider than the scorer's worst 20% band so nothing is pre-filtered out of scoring

type InboxItemRow = {
  id: string;
  org_id: string;
  file_path: string;
  file_name: string;
  content_type: string | null;
  size: number | null;
  display_name: string | null;
  amount: number | string | null;
  currency: string | null;
  base_amount: number | string | null;
  base_currency: string | null;
  date: string | null;
  type: "invoice" | "expense" | "other" | null;
  status: string;
  transaction_id: string | null;
};

type TransactionRow = {
  id: string;
  name: string;
  amount: number | string;
  currency: string;
  base_amount: number | string | null;
  base_currency: string | null;
  date: string;
  type: "income" | "expense";
  payment_mode: string | null;
  status: string | null;
};

export type MatchInboxItemResult =
  | { matched: true; tier: "auto_matched"; transactionId: string; confidence: number }
  | { matched: false; reason: string; topConfidence?: number }
  | { matched: false; tier: MatchTier; suggestionsWritten: number; topTransactionId: string; confidence: number }
  | { skipped: true; reason: string };

function toNumber(v: number | string | null): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
}

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

// ── Candidate search ─────────────────────────────────────────────────────────

async function embeddingCandidateSearch(
  supabase: SupabaseClient,
  orgId: string,
  inboxItemId: string,
): Promise<Map<string, number>> {
  const { data, error } = await supabase.rpc("match_inbox_candidates", {
    p_org_id: orgId,
    p_inbox_item_id: inboxItemId,
    p_limit: 20,
  });

  if (error) {
    logger.warn("match_inbox_candidates RPC failed, will fall back to date+amount window", {
      inboxItemId,
      error: error.message,
    });
    return new Map();
  }

  const map = new Map<string, number>();
  for (const row of data ?? []) {
    if (row.transaction_id && typeof row.similarity === "number") {
      map.set(row.transaction_id as string, row.similarity as number);
    }
  }
  return map;
}

/** No embedding candidates (item embedding missing, or genuinely no similar
 *  transactions) — fall back to a plain date+amount window so items still
 *  get matched. These candidates score with embeddingScore=0, which — by
 *  design — keeps them out of the auto-match tier (gate requires >= 0.85)
 *  but still lets them reach high_confidence/suggested via amount+date. */
async function fallbackCandidateSearch(
  supabase: SupabaseClient,
  orgId: string,
  item: InboxItemRow,
): Promise<string[]> {
  const amount = toNumber(item.amount);
  if (amount === null || !item.date) return [];

  const center = new Date(`${item.date}T00:00:00Z`);
  const from = new Date(center);
  from.setUTCDate(from.getUTCDate() - FALLBACK_DATE_WINDOW_DAYS);
  const to = new Date(center);
  to.setUTCDate(to.getUTCDate() + FALLBACK_DATE_WINDOW_DAYS);

  const minAmount = Math.max(0, amount * (1 - FALLBACK_AMOUNT_TOLERANCE));
  const maxAmount = amount * (1 + FALLBACK_AMOUNT_TOLERANCE);

  const { data, error } = await supabase
    .from("transactions")
    .select("id")
    .eq("org_id", orgId)
    .gte("amount", minAmount)
    .lte("amount", maxAmount)
    .gte("date", from.toISOString().slice(0, 10))
    .lte("date", to.toISOString().slice(0, 10))
    .in("status", ["pending", "completed"])
    .limit(20);

  if (error || !data) return [];
  return data.map((r) => r.id as string);
}

async function fetchTransactions(supabase: SupabaseClient, orgId: string, ids: string[]): Promise<TransactionRow[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("transactions")
    .select("id, name, amount, currency, base_amount, base_currency, date, type, payment_mode, status")
    .eq("org_id", orgId)
    .in("id", ids)
    .in("status", ["pending", "completed"]);

  if (error || !data) return [];
  return data as TransactionRow[];
}

/** Live suggestion pairs for this inbox item (any status except 'expired') —
 *  the partial unique index on (inbox_item_id, transaction_id) enforces this
 *  at the DB level too; filtering here avoids re-scoring/re-inserting a
 *  declined (or already pending/confirmed) pair. */
async function fetchBlockedTransactionIds(supabase: SupabaseClient, inboxItemId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("transaction_match_suggestions")
    .select("transaction_id, status")
    .eq("inbox_item_id", inboxItemId)
    .neq("status", "expired");

  if (error || !data) return new Set();
  return new Set(data.map((r) => r.transaction_id as string));
}

// ── Merchant pattern learning (3e) ──────────────────────────────────────────

async function getMerchantEligibility(supabase: SupabaseClient, orgId: string, displayName: string | null): Promise<boolean> {
  if (!displayName) return false;
  const normalized = displayName.trim().toLowerCase();
  if (!normalized) return false;

  const { data, error } = await supabase
    .from("transaction_match_suggestions")
    .select("status, inbox_items!inner(display_name)")
    .eq("org_id", orgId)
    .in("status", ["confirmed", "declined"]);

  if (error || !data) return false;

  let confirmed = 0;
  let declined = 0;
  for (const row of data as unknown as { status: string; inbox_items: { display_name: string | null } | null }[]) {
    const rowName = row.inbox_items?.display_name;
    if (!rowName || rowName.trim().toLowerCase() !== normalized) continue;
    if (row.status === "confirmed") confirmed++;
    else if (row.status === "declined") declined++;
  }

  return isMerchantAutoMatchEligible(confirmed, declined);
}

// ── Team calibration (3f) ───────────────────────────────────────────────────

async function getCalibratedSuggestedThreshold(supabase: SupabaseClient, orgId: string): Promise<number> {
  const { data, error } = await supabase
    .from("transaction_match_suggestions")
    .select("status")
    .eq("org_id", orgId)
    .in("status", ["confirmed", "declined"]);

  if (error || !data) return CALIBRATION_LIMITS.defaultSuggestedThreshold;

  const confirmed = data.filter((r) => r.status === "confirmed").length;
  const declined = data.filter((r) => r.status === "declined").length;
  return calibrateSuggestedThreshold(confirmed, declined);
}

// ── Suggestion writes ────────────────────────────────────────────────────────

async function insertSuggestion(
  supabase: SupabaseClient,
  params: {
    orgId: string;
    inboxItemId: string;
    candidate: ScoredCandidate;
    matchType: Exclude<MatchTier, "none">;
    status: "pending" | "confirmed";
  },
): Promise<void> {
  const { orgId, inboxItemId, candidate, matchType, status } = params;

  // Plain insert, not upsert: the uniqueness guard is a *partial* unique
  // index (`WHERE status != 'expired'`), which PostgREST's on_conflict
  // param can't target (Postgres requires the WHERE clause to be restated
  // literally in the ON CONFLICT clause to infer a partial index — there's
  // no way to pass that through supabase-js). We already pre-filter
  // candidates against fetchBlockedTransactionIds() before scoring, so a
  // real conflict here only happens on a race with another run; catching
  // 23505 gives the same "declined pairs never re-suggested" guarantee.
  const { error } = await supabase.from("transaction_match_suggestions").insert({
    org_id: orgId,
    inbox_item_id: inboxItemId,
    transaction_id: candidate.transactionId,
    confidence_score: round4(candidate.confidence),
    amount_score: round4(candidate.amountScore),
    currency_score: round4(candidate.currencyScore),
    date_score: round4(candidate.dateScore),
    embedding_score: round4(candidate.embeddingScore),
    match_type: matchType,
    status,
    match_details: candidate.matchDetails,
    user_action_at: status === "confirmed" ? new Date().toISOString() : null,
  });

  if (error && error.code !== "23505") {
    logger.error("Failed to insert match suggestion", { inboxItemId, transactionId: candidate.transactionId, error: error.message });
  }
}

/** Score one inbox item against candidate transactions and write the outcome
 *  (auto-match attachment, suggestion rows, or status='no_match'). Shared by
 *  match-inbox-transactions.ts (forward direction, triggered on extraction)
 *  and batch-match-inbox.ts (reverse direction, triggered on new transactions
 *  / the daily no_match recheck). Callers own fetching/validating the item
 *  row and any early-exit guards (already matched, already terminal, etc.) —
 *  this function assumes the item is a live matching candidate. */
export async function matchInboxItem(supabase: SupabaseClient, inboxItemId: string): Promise<MatchInboxItemResult> {
  const { data: item, error: itemError } = await supabase
    .from("inbox_items")
    .select(
      "id, org_id, file_path, file_name, content_type, size, display_name, amount, currency, base_amount, base_currency, date, type, status, transaction_id",
    )
    .eq("id", inboxItemId)
    .single<InboxItemRow>();

  if (itemError || !item) {
    throw new Error(`Inbox item not found: ${itemError?.message ?? inboxItemId}`);
  }

  if (item.transaction_id) {
    logger.info("Inbox item already matched, skipping", { inboxItemId });
    return { skipped: true, reason: "already_matched" };
  }

  const amount = toNumber(item.amount);
  if (amount === null || !item.date || item.type === "other" || item.type === null) {
    logger.info("Inbox item not matchable (missing amount/date or type=other)", { inboxItemId, type: item.type });
    await supabase.from("inbox_items").update({ status: "no_match" }).eq("id", inboxItemId);
    return { matched: false, reason: "nothing_to_match" };
  }

  // ── Candidate search ─────────────────────────────────────────────────────
  const embeddingSimilarity = await embeddingCandidateSearch(supabase, item.org_id, inboxItemId);
  let candidateIds = [...embeddingSimilarity.keys()];

  if (candidateIds.length === 0) {
    candidateIds = await fallbackCandidateSearch(supabase, item.org_id, item);
    logger.info("No embedding candidates, used date+amount fallback", { inboxItemId, count: candidateIds.length });
  }

  const blocked = await fetchBlockedTransactionIds(supabase, inboxItemId);
  candidateIds = candidateIds.filter((id) => !blocked.has(id));

  if (candidateIds.length === 0) {
    await supabase.from("inbox_items").update({ status: "no_match" }).eq("id", inboxItemId);
    return { matched: false, reason: "no_candidates" };
  }

  const transactions = await fetchTransactions(supabase, item.org_id, candidateIds);
  if (transactions.length === 0) {
    await supabase.from("inbox_items").update({ status: "no_match" }).eq("id", inboxItemId);
    return { matched: false, reason: "no_candidates" };
  }

  // ── Scoring ──────────────────────────────────────────────────────────────
  const inboxForScoring: InboxItemForScoring = {
    amount,
    currency: item.currency,
    baseAmount: toNumber(item.base_amount),
    baseCurrency: item.base_currency,
    date: item.date,
    type: item.type,
  };

  const scored = transactions.map((tx) => {
    const candidate: TransactionCandidate = {
      id: tx.id,
      amount: toNumber(tx.amount) ?? 0,
      currency: tx.currency,
      baseAmount: toNumber(tx.base_amount),
      baseCurrency: tx.base_currency,
      date: tx.date,
      type: tx.type,
      paymentMode: tx.payment_mode,
      embeddingSimilarity: embeddingSimilarity.get(tx.id) ?? null,
    };
    return scoreCandidate(inboxForScoring, candidate);
  });

  const ranked = rankCandidates(scored);
  if (ranked.length === 0) {
    await supabase.from("inbox_items").update({ status: "no_match" }).eq("id", inboxItemId);
    return { matched: false, reason: "no_candidates" };
  }

  const merchantEligible = await getMerchantEligibility(supabase, item.org_id, item.display_name);
  const suggestedThreshold = await getCalibratedSuggestedThreshold(supabase, item.org_id);

  const top = ranked[0];
  const topTier = classifyTier({
    confidence: top.confidence,
    embeddingScore: top.embeddingScore,
    dateScore: top.dateScore,
    isPerfectFinancialMatch: top.isPerfectFinancialMatch,
    isExcellentFinancialMatch: top.isExcellentFinancialMatch,
    merchantEligible,
    suggestedThreshold,
  });

  logger.info("Match scored", {
    inboxItemId,
    topTransactionId: top.transactionId,
    confidence: top.confidence,
    topTier,
    merchantEligible,
    suggestedThreshold,
    candidateCount: ranked.length,
  });

  // ── Auto-match ───────────────────────────────────────────────────────────
  if (topTier === "auto_matched") {
    const { data: attachment, error: attachError } = await supabase
      .from("transaction_attachments")
      .insert({
        transaction_id: top.transactionId,
        org_id: item.org_id,
        file_path: item.file_path,
        file_name: item.file_name,
        file_size: item.size,
        content_type: item.content_type,
      })
      .select("id")
      .single();

    if (attachError || !attachment) {
      logger.error("Auto-match attachment insert failed, falling back to suggestion", {
        inboxItemId,
        error: attachError?.message,
      });
      await insertSuggestion(supabase, { orgId: item.org_id, inboxItemId, candidate: top, matchType: "high_confidence", status: "pending" });
      await supabase.from("inbox_items").update({ status: "suggested_match" }).eq("id", inboxItemId);
      return { matched: false, reason: "attachment_insert_failed" };
    }

    await insertSuggestion(supabase, {
      orgId: item.org_id,
      inboxItemId,
      candidate: top,
      matchType: "auto_matched",
      status: "confirmed",
    });

    await supabase
      .from("inbox_items")
      .update({ transaction_id: top.transactionId, attachment_id: attachment.id, status: "done" })
      .eq("id", inboxItemId);

    logger.info("Auto-matched inbox item", { inboxItemId, transactionId: top.transactionId, confidence: top.confidence });

    const matchedTx = transactions.find((tx) => tx.id === top.transactionId);
    const documentName = item.display_name ?? item.file_name;
    const transactionName = matchedTx?.name ?? "a transaction";
    const isCrossCurrency = !!item.currency && !!matchedTx?.currency && item.currency !== matchedTx.currency;

    await notifyInbox(
      isCrossCurrency ? "inbox.cross_currency_matched" : "inbox.auto_matched",
      item.org_id,
      isCrossCurrency
        ? {
            documentName,
            transactionName,
            inboxId: inboxItemId,
            documentAmount: amount,
            documentCurrency: item.currency,
            transactionAmount: toNumber(matchedTx?.amount ?? null) ?? 0,
            transactionCurrency: matchedTx?.currency ?? "",
          }
        : { documentName, transactionName, inboxId: inboxItemId, confidence: Math.round(top.confidence * 100) },
    );

    return { matched: true, tier: "auto_matched", transactionId: top.transactionId, confidence: top.confidence };
  }

  // ── Suggestions ──────────────────────────────────────────────────────────
  // Non-top candidates never auto-match (only one transaction can be
  // attached per item) — cap their tier at high_confidence even if they'd
  // independently qualify.
  let bestNonNoneTier: MatchTier = "none";
  let suggestionsWritten = 0;

  for (let i = 0; i < ranked.length && suggestionsWritten < MAX_SUGGESTIONS_PER_ITEM; i++) {
    const candidate = ranked[i];
    let tier: MatchTier =
      i === 0
        ? topTier
        : classifyTier({
            confidence: candidate.confidence,
            embeddingScore: candidate.embeddingScore,
            dateScore: candidate.dateScore,
            isPerfectFinancialMatch: candidate.isPerfectFinancialMatch,
            isExcellentFinancialMatch: candidate.isExcellentFinancialMatch,
            merchantEligible: false, // never auto-match a non-top candidate
            suggestedThreshold,
          });
    if (tier === "auto_matched") tier = "high_confidence";
    if (tier === "none") continue;

    if (bestNonNoneTier === "none") bestNonNoneTier = tier;
    await insertSuggestion(supabase, { orgId: item.org_id, inboxItemId, candidate, matchType: tier, status: "pending" });
    suggestionsWritten++;
  }

  if (suggestionsWritten === 0) {
    await supabase.from("inbox_items").update({ status: "no_match" }).eq("id", inboxItemId);
    return { matched: false, reason: "below_threshold", topConfidence: top.confidence };
  }

  await supabase.from("inbox_items").update({ status: "suggested_match" }).eq("id", inboxItemId);

  const matchedTx = transactions.find((tx) => tx.id === top.transactionId);
  await notifyInbox("inbox.needs_review", item.org_id, {
    documentName: item.display_name ?? item.file_name,
    transactionName: matchedTx?.name ?? "a transaction",
    confidence: Math.round(top.confidence * 100),
    inboxId: inboxItemId,
    matchType: bestNonNoneTier,
  });

  return {
    matched: false,
    tier: bestNonNoneTier,
    suggestionsWritten,
    topTransactionId: top.transactionId,
    confidence: top.confidence,
  };
}
