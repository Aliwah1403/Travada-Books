// Inbox Batch 3b — the 4-signal matching scorer.
//
// Pure functions only (no I/O, no Supabase) so this module stays trivially
// unit-testable. Constants and behavior are ported from INBOX-PLAN.md §Phase 3
// (3c/3d/3e/3f) — do not retune without updating that doc.
//
// Orchestration (candidate fetch, merchant-eligibility DB lookups, calibration
// DB lookups, writing suggestions) lives in trigger/match-inbox-transactions.ts.

export type InboxItemType = "invoice" | "expense" | "other";
export type TransactionType = "income" | "expense";

export interface InboxItemForScoring {
  amount: number | null;
  currency: string | null;
  baseAmount: number | null;
  baseCurrency: string | null;
  date: string | null; // ISO date (YYYY-MM-DD)
  type: InboxItemType | null;
}

export interface TransactionCandidate {
  id: string;
  amount: number; // always positive in the transactions table
  currency: string;
  baseAmount: number | null;
  baseCurrency: string | null;
  date: string; // ISO date (YYYY-MM-DD)
  type: TransactionType;
  paymentMode: string | null; // 'mpesa' | 'bank_transfer' | 'cash' | 'cheque' | 'card' | 'other' | null
  /** Cosine similarity (1 - distance) from match_inbox_candidates, or null if no
   *  embedding candidate exists (date+amount fallback path — see 3c note below). */
  embeddingSimilarity: number | null;
}

export interface ScoredCandidate {
  transactionId: string;
  confidence: number;
  amountScore: number;
  currencyScore: number;
  dateScore: number;
  embeddingScore: number;
  isPerfectFinancialMatch: boolean;
  isExcellentFinancialMatch: boolean;
  isOppositeSign: boolean;
  isCrossCurrency: boolean;
  amountDiffRatio: number;
  matchDetails: Record<string, unknown>;
}

// ── Weights (INBOX-PLAN 3c) ─────────────────────────────────────────────────

const STANDARD_WEIGHTS = { embedding: 0.5, amount: 0.35, currency: 0.1, date: 0.05 };
const PERFECT_FINANCIAL_WEIGHTS = { embedding: 0.25, amount: 0.45, currency: 0.15, date: 0.15 };

// ── Amount bands (INBOX-PLAN 3c) ────────────────────────────────────────────

function amountBandScore(diffRatio: number): number {
  if (diffRatio <= 0) return 1.0;
  if (diffRatio <= 0.01) return 0.98;
  if (diffRatio <= 0.02) return 0.95;
  if (diffRatio <= 0.025) return 0.92;
  if (diffRatio <= 0.03) return 0.9;
  if (diffRatio <= 0.05) return 0.85;
  if (diffRatio <= 0.1) return 0.6;
  if (diffRatio <= 0.2) return 0.3;
  return 0;
}

/** Tiered cross-currency tolerance by transaction size (INBOX-PLAN 3c). */
function crossCurrencyTolerance(referenceAmount: number): number {
  if (referenceAmount < 100) return 0.04;
  if (referenceAmount < 1000) return 0.02;
  return 0.015;
}

// ── Amount + currency scoring ───────────────────────────────────────────────

export interface AmountCurrencyResult {
  amountScore: number;
  currencyScore: number;
  amountDiffRatio: number;
  isCrossCurrency: boolean;
  /** Exact same-currency amount match, or within cross-currency tolerance. */
  isExactFinancialMatch: boolean;
}

export function scoreAmountAndCurrency(
  inbox: Pick<InboxItemForScoring, "amount" | "currency" | "baseAmount" | "baseCurrency">,
  tx: Pick<TransactionCandidate, "amount" | "currency" | "baseAmount" | "baseCurrency">,
): AmountCurrencyResult {
  const hasCurrency = !!inbox.currency && !!tx.currency;
  const isCrossCurrency = hasCurrency && inbox.currency !== tx.currency;

  // Currency score (independent 10%/15% signal): same=1.0, different=0.3, missing=0.5.
  const currencyScore = !hasCurrency ? 0.5 : isCrossCurrency ? 0.3 : 1.0;

  let referenceAmount: number;
  let candidateAmount: number;
  let usingBaseAmounts = false;

  if (isCrossCurrency) {
    // Cross-currency: only compare via base_amount/base_currency (INBOX-PLAN 3c).
    if (inbox.baseAmount != null && tx.baseAmount != null) {
      referenceAmount = Math.abs(Number(inbox.baseAmount));
      candidateAmount = Math.abs(Number(tx.baseAmount));
      usingBaseAmounts = true;
    } else if (inbox.amount != null) {
      // No base amounts available — fall back to raw amounts as a weak signal.
      referenceAmount = Math.abs(Number(inbox.amount));
      candidateAmount = Math.abs(Number(tx.amount));
    } else {
      return { amountScore: 0, currencyScore, amountDiffRatio: 1, isCrossCurrency, isExactFinancialMatch: false };
    }
  } else {
    if (inbox.amount == null) {
      return { amountScore: 0, currencyScore, amountDiffRatio: 1, isCrossCurrency, isExactFinancialMatch: false };
    }
    referenceAmount = Math.abs(Number(inbox.amount));
    candidateAmount = Math.abs(Number(tx.amount));
  }

  const maxAmount = Math.max(referenceAmount, candidateAmount, 0.0001);
  const diffRatio = Math.abs(referenceAmount - candidateAmount) / maxAmount;

  let amountScore = amountBandScore(diffRatio);

  // Exact-currency match bonus (INBOX-PLAN 3c) — only meaningful for the
  // same-currency path; cross-currency amounts are never "exact-currency".
  if (!isCrossCurrency && hasCurrency && diffRatio <= 0.01) {
    amountScore = Math.min(1, amountScore * 1.1);
  }

  const tolerance = usingBaseAmounts ? crossCurrencyTolerance(referenceAmount) : 0;
  const isExactFinancialMatch = isCrossCurrency ? usingBaseAmounts && diffRatio <= tolerance : diffRatio === 0;

  return { amountScore, currencyScore, amountDiffRatio: diffRatio, isCrossCurrency, isExactFinancialMatch };
}

// ── Date scoring (type-aware, INBOX-PLAN 3c) ────────────────────────────────

function toUtcDays(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

/** Days from `isoA` to `isoB` (positive if B is after A). Parses plain
 *  YYYY-MM-DD dates as UTC to avoid local-timezone off-by-one errors. */
function daysBetween(isoA: string, isoB: string): number {
  return Math.round(toUtcDays(isoB) - toUtcDays(isoA));
}

/**
 * Invoice items: score payment-terms patterns. `diffDays` = transaction date
 * minus invoice date (positive = paid after the invoice date).
 *
 * Net-30 band (24-38 days -> 0.98) is exactly specified in INBOX-PLAN 3c.
 * Net-7/15/60/90 bands and the decay curve are not numerically specified
 * there ("with bands for Net-7/15/60/90") — interpolated here with
 * proportionally similar tolerance to Net-30 (~±20-25%). Documented as a
 * deviation in the batch report; safe to retune later without touching the
 * gate logic.
 */
function invoiceDateScore(diffDays: number): number {
  if (diffDays < 0) {
    // Advance payment (paid before the invoice date).
    const early = Math.abs(diffDays);
    if (early <= 14) return 0.85;
    return Math.max(0, 0.85 - (early - 14) * 0.02);
  }

  const terms: { center: number; loose: number; score: number }[] = [
    { center: 7, loose: 3, score: 0.95 },
    { center: 15, loose: 4, score: 0.95 },
    { center: 30, loose: 7, score: 0.98 }, // 23-37 ~ INBOX-PLAN's 24-38 band
    { center: 60, loose: 10, score: 0.95 },
    { center: 90, loose: 12, score: 0.9 },
  ];

  // Immediate payment (paid same day / within a couple days of the invoice).
  if (diffDays <= 2) return 0.95;

  let best = 0;
  for (const term of terms) {
    const distance = Math.abs(diffDays - term.center);
    if (distance <= term.loose) {
      best = Math.max(best, term.score);
    } else {
      // Decay outward from the band edge.
      const overshoot = distance - term.loose;
      const decayed = Math.max(0, term.score - overshoot * 0.03);
      best = Math.max(best, decayed);
    }
  }
  return best;
}

/**
 * Expense items: receipt-shortly-after-transaction. `diffDays` is the
 * absolute distance between the inbox item's document date and the
 * transaction date.
 *
 * Kenya/M-Pesa tightening (INBOX-PLAN 3c): Midday's bands bake in a ~3-day
 * open-banking settlement delay. M-Pesa settles instantly, so for
 * M-Pesa-sourced transactions we drop that offset; bank/imported
 * transactions keep it.
 */
function expenseDateScore(diffDays: number, isMpesa: boolean): number {
  const settlementOffset = isMpesa ? 0 : 3;

  const sameNextDay = 1 + settlementOffset;
  const withinWeek = 7 + settlementOffset;
  const withinMonth = 30 + settlementOffset;

  if (diffDays <= sameNextDay) return 0.99;
  if (diffDays <= withinWeek) return 0.95;
  if (diffDays <= withinMonth) return 0.9;

  const weeksOver = (diffDays - withinMonth) / 7;
  return Math.max(0.3, 0.9 - weeksOver * 0.1);
}

export function scoreDate(inbox: Pick<InboxItemForScoring, "date" | "type">, tx: Pick<TransactionCandidate, "date" | "paymentMode">): number {
  if (!inbox.date || !tx.date) return 0.5; // neutral — missing data, don't penalize heavily
  const isMpesa = tx.paymentMode === "mpesa";

  if (inbox.type === "invoice") {
    return invoiceDateScore(daysBetween(inbox.date, tx.date));
  }
  // 'expense' (and any other scored type — 'other' is filtered out upstream).
  return expenseDateScore(Math.abs(daysBetween(inbox.date, tx.date)), isMpesa);
}

// ── Opposite-sign detection ─────────────────────────────────────────────────

/** Inbox invoices/expenses represent money the org owes/spent — they should
 *  match an 'expense' transaction. A match against an 'income' transaction
 *  (an incoming payment) is a direction mismatch — suppress with a penalty
 *  rather than excluding outright (still surfaced as a low-confidence
 *  suggestion in case the extraction/direction assumption was wrong). */
function isOppositeSign(inboxType: InboxItemType | null, txType: TransactionType): boolean {
  if (inboxType === "other" || inboxType === null) return false;
  const expected: TransactionType = "expense";
  return txType !== expected;
}

// ── Full confidence blend ───────────────────────────────────────────────────

export function scoreCandidate(inbox: InboxItemForScoring, tx: TransactionCandidate): ScoredCandidate {
  const { amountScore: rawAmountScore, currencyScore, amountDiffRatio, isCrossCurrency, isExactFinancialMatch } =
    scoreAmountAndCurrency(inbox, tx);

  const oppositeSign = isOppositeSign(inbox.type, tx.type);
  const oppositeSignPenalty = oppositeSign ? (isCrossCurrency ? 0.3 : 0.7) : 1.0;
  const amountScore = rawAmountScore * oppositeSignPenalty;

  const dateScore = scoreDate(inbox, tx);
  const embeddingScore = tx.embeddingSimilarity ?? 0;

  const isPerfectFinancialMatch = isExactFinancialMatch && !oppositeSign;
  const isExcellentFinancialMatch = !oppositeSign && amountScore >= 0.95;

  const weights = isPerfectFinancialMatch ? PERFECT_FINANCIAL_WEIGHTS : STANDARD_WEIGHTS;

  const confidence =
    weights.embedding * embeddingScore +
    weights.amount * amountScore +
    weights.currency * currencyScore +
    weights.date * dateScore;

  return {
    transactionId: tx.id,
    confidence: Math.min(1, Math.max(0, confidence)),
    amountScore,
    currencyScore,
    dateScore,
    embeddingScore,
    isPerfectFinancialMatch,
    isExcellentFinancialMatch,
    isOppositeSign: oppositeSign,
    isCrossCurrency,
    amountDiffRatio,
    matchDetails: {
      weights,
      rawAmountScore,
      oppositeSignPenalty,
      isExactFinancialMatch,
    },
  };
}

// ── Tie-breaking (INBOX-PLAN 3c) ────────────────────────────────────────────

/**
 * Sorts candidates best-first: a perfect financial match beats a higher
 * blended confidence within 0.05; ties then broken by date proximity
 * (higher dateScore), then amount accuracy (lower amountDiffRatio).
 */
export function rankCandidates(candidates: ScoredCandidate[]): ScoredCandidate[] {
  return [...candidates].sort((a, b) => {
    const confidenceGap = b.confidence - a.confidence;
    if (Math.abs(confidenceGap) > 0.05) return confidenceGap;

    if (a.isPerfectFinancialMatch !== b.isPerfectFinancialMatch) {
      return a.isPerfectFinancialMatch ? -1 : 1;
    }
    if (confidenceGap !== 0) return confidenceGap;

    if (a.dateScore !== b.dateScore) return b.dateScore - a.dateScore;
    return a.amountDiffRatio - b.amountDiffRatio;
  });
}

// ── Tier gates (INBOX-PLAN 3d) ──────────────────────────────────────────────

export type MatchTier = "auto_matched" | "high_confidence" | "suggested" | "none";

export interface TierGateInput {
  confidence: number;
  embeddingScore: number;
  dateScore: number;
  isPerfectFinancialMatch: boolean;
  isExcellentFinancialMatch: boolean;
  merchantEligible: boolean;
  suggestedThreshold: number; // calibrated floor, default 0.75, hard floor 0.75
}

export function classifyTier(input: TierGateInput): MatchTier {
  const {
    confidence,
    embeddingScore,
    dateScore,
    isPerfectFinancialMatch,
    isExcellentFinancialMatch,
    merchantEligible,
    suggestedThreshold,
  } = input;

  const financiallyExcellent = isPerfectFinancialMatch || isExcellentFinancialMatch;

  if (
    confidence >= 0.9 &&
    merchantEligible &&
    embeddingScore >= 0.85 &&
    dateScore >= 0.7 &&
    financiallyExcellent
  ) {
    return "auto_matched";
  }

  // A >=0.90 score that failed an auto-match gate above (usually merchant
  // eligibility — the first receipt from a vendor) is still our strongest
  // suggestion.
  if (confidence >= 0.9) return "high_confidence";

  // Everything down to the calibrated floor is a plain suggestion. This is the
  // boundary team calibration (3e/3f) actually moves, so it must sit BELOW the
  // high_confidence band or calibration has no effect.
  if (confidence >= Math.max(CALIBRATION_LIMITS.floor, suggestedThreshold)) {
    return "suggested";
  }

  return "none";
}

// ── Merchant pattern learning (INBOX-PLAN 3e) — pure eligibility rule ───────

export const MERCHANT_ELIGIBILITY_MIN_CONFIRMED = 3;
export const MERCHANT_ELIGIBILITY_MIN_ACCURACY = 0.9;

/** Pure eligibility check given already-fetched confirm/decline counts for a
 *  merchant. DB lookup of those counts lives in the task (match-inbox-transactions.ts). */
export function isMerchantAutoMatchEligible(confirmedCount: number, declinedCount: number): boolean {
  if (confirmedCount < MERCHANT_ELIGIBILITY_MIN_CONFIRMED) return false;
  const total = confirmedCount + declinedCount;
  if (total === 0) return false;
  return confirmedCount / total >= MERCHANT_ELIGIBILITY_MIN_ACCURACY;
}

// ── Team calibration (INBOX-PLAN 3f) — pure calculation ─────────────────────

export const CALIBRATION_LIMITS = {
  defaultSuggestedThreshold: 0.75,
  floor: 0.75,
  maxAdjustment: 0.03,
  minSamples: {
    suggested: 3,
    auto: 5,
    conservative: 8,
  },
};

/**
 * Derives the suggested-match threshold from the org's confirm/decline
 * ratio. High confirm rate -> team trusts suggestions -> lower (more
 * permissive) threshold. Low confirm rate -> raise (more conservative)
 * threshold. Max ±3% adjustment; hard floor 0.75; needs >= 3 samples or
 * returns the default.
 */
export function calibrateSuggestedThreshold(confirmedCount: number, declinedCount: number): number {
  const { defaultSuggestedThreshold, floor, maxAdjustment, minSamples } = CALIBRATION_LIMITS;
  const total = confirmedCount + declinedCount;
  if (total < minSamples.suggested) return defaultSuggestedThreshold;

  const confirmRate = confirmedCount / total;
  // confirmRate 1.0 -> -maxAdjustment (more permissive); confirmRate 0.0 -> +maxAdjustment (more conservative).
  const delta = (0.5 - confirmRate) * 2 * maxAdjustment;
  const threshold = defaultSuggestedThreshold + delta;

  return Math.max(floor, Math.min(threshold, defaultSuggestedThreshold + maxAdjustment));
}
