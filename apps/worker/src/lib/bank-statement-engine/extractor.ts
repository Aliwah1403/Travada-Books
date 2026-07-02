import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createMistral } from "@ai-sdk/mistral";
import { generateObject } from "ai";
import { bankStatementSchema, type BankStatementResult, type BankTransactionRow } from "./schema";
import { buildPrompt } from "./prompts";

// ─── Providers ────────────────────────────────────────────────────────────────

const mistral = createMistral({ apiKey: process.env.MISTRAL_API_KEY! });
const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY! });

type AIProvider = "mistral" | "google";
type ModelConfig = { provider: AIProvider; model: string };

// Mirrors Midday's extraction-config.ts model chain
const MODELS = {
  primary: { provider: "mistral" as const, model: "mistral-small-latest" },
  secondary: { provider: "google" as const, model: "gemini-2.0-flash" },
  tertiary: { provider: "google" as const, model: "gemini-1.5-pro" },
} satisfies Record<string, ModelConfig>;

const QUALITY_THRESHOLD = 70;

// ─── Types ────────────────────────────────────────────────────────────────────

export type QualityScore = {
  score: number;
  validRows: number;
  totalRows: number;
  issues: string[];
};

export type ExtractionResult = {
  data: BankStatementResult;
  quality: QualityScore;
  warnings: string[];
  passesUsed: number;
};

type Candidate = { data: BankStatementResult; quality: QualityScore };

// ─── Quality scoring ──────────────────────────────────────────────────────────

function scoreResult(result: BankStatementResult): QualityScore {
  const txns = result.transactions;
  if (txns.length === 0) {
    return { score: 0, validRows: 0, totalRows: 0, issues: ["No transactions extracted"] };
  }

  let validRows = 0;
  for (const row of txns) {
    const hasDate = /^\d{4}-\d{2}-\d{2}$/.test(row.date ?? "");
    const hasAmount = typeof row.amount === "number" && row.amount > 0;
    if (hasDate && hasAmount) validRows++;
  }

  const score = Math.round((validRows / txns.length) * 100);
  const issues: string[] = [];
  if (validRows < txns.length) {
    issues.push(`${txns.length - validRows} rows have invalid date or amount`);
  }
  if (txns.length < 2) {
    issues.push("Suspiciously few transactions — may have missed rows");
  }

  return { score, validRows, totalRows: txns.length, issues };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

async function retryCall<T>(fn: () => Promise<T>, retries = 2, delayMs = 2000): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
  throw new Error("unreachable");
}

function pickBetter(a: Candidate, b: Candidate): Candidate {
  return b.quality.validRows > a.quality.validRows ? b : a;
}

// ─── Pass 4: balance consistency check ───────────────────────────────────────

function checkBalanceConsistency(transactions: BankTransactionRow[]): string[] {
  const withBalance = transactions.filter((t) => t.balance !== null);
  if (withBalance.length < 3) return [];

  let inconsistencies = 0;
  for (let i = 1; i < withBalance.length; i++) {
    const prev = withBalance[i - 1].balance!;
    const curr = withBalance[i].balance!;
    const txn = withBalance[i];
    const delta = curr - prev;
    const expected = txn.type === "income" ? txn.amount : -txn.amount;
    if (Math.abs(delta - expected) > 1) inconsistencies++;
  }

  if (inconsistencies > withBalance.length * 0.2) {
    return [
      `${inconsistencies} of ${withBalance.length} rows have balance deltas that don't match transaction amounts — possible running balance confusion`,
    ];
  }
  return [];
}

// ─── Core extraction (single model attempt) ───────────────────────────────────

async function extractWithModel(
  dataUri: string,
  prompt: string,
  modelConfig: ModelConfig,
): Promise<BankStatementResult> {
  const model =
    modelConfig.provider === "mistral"
      ? mistral(modelConfig.model)
      : google(modelConfig.model);

  const providerOptions =
    modelConfig.provider === "mistral"
      ? { mistral: { documentPageLimit: 10 } }
      : undefined;

  const result = await retryCall(
    () =>
      generateObject({
        model,
        schema: bankStatementSchema,
        temperature: 0.1,
        abortSignal: AbortSignal.timeout(120_000),
        messages: [
          { role: "system", content: prompt },
          {
            role: "user",
            content: [
              {
                type: "file",
                data: dataUri,
                mediaType: "application/pdf" as const,
              },
            ],
          },
        ],
        ...(providerOptions ? { providerOptions } : {}),
      }),
    2,
    2000,
  );

  return result.object;
}

// ─── Main extractor (4-pass, mirrors Midday's BaseExtractionEngine) ───────────

export async function extractBankStatement(
  pdfBuffer: Buffer,
  orgName: string | null,
): Promise<ExtractionResult> {
  const base64 = pdfBuffer.toString("base64");
  const dataUri = `data:application/pdf;base64,${base64}`;

  // Pass 1: Primary model (Mistral) with basic prompt
  let best: Candidate;
  let passesUsed = 1;

  try {
    const prompt = buildPrompt(orgName, false);
    const data = await extractWithModel(dataUri, prompt, MODELS.primary);
    best = { data, quality: scoreResult(data) };
  } catch {
    // Primary failed entirely — fall straight to secondary
    const prompt = buildPrompt(orgName, false);
    const data = await extractWithModel(dataUri, prompt, MODELS.secondary);
    best = { data, quality: scoreResult(data) };
    return {
      data: best.data,
      quality: best.quality,
      warnings: checkBalanceConsistency(best.data.transactions),
      passesUsed,
    };
  }

  if (best.quality.score >= QUALITY_THRESHOLD && best.quality.totalRows > 0) {
    return {
      data: best.data,
      quality: best.quality,
      warnings: checkBalanceConsistency(best.data.transactions),
      passesUsed,
    };
  }

  // Pass 2: Secondary model (Gemini Flash) with chain-of-thought prompt
  passesUsed = 2;
  try {
    const prompt = buildPrompt(orgName, true);
    const data = await extractWithModel(dataUri, prompt, MODELS.secondary);
    const candidate = { data, quality: scoreResult(data) };
    best = pickBetter(best, candidate);

    if (best.quality.score >= QUALITY_THRESHOLD) {
      return {
        data: best.data,
        quality: best.quality,
        warnings: checkBalanceConsistency(best.data.transactions),
        passesUsed,
      };
    }
  } catch {
    // Pass 2 failed — continue to Pass 3
  }

  // Pass 3: Tertiary model (Gemini Pro) with chain-of-thought prompt
  passesUsed = 3;
  try {
    const prompt = buildPrompt(orgName, true);
    const data = await extractWithModel(dataUri, prompt, MODELS.tertiary);
    const candidate = { data, quality: scoreResult(data) };
    best = pickBetter(best, candidate);
  } catch {
    // All models failed — return best we have
  }

  // Pass 4: Balance consistency check (warnings only, no data modification)
  const warnings = checkBalanceConsistency(best.data.transactions);

  return { data: best.data, quality: best.quality, warnings, passesUsed };
}
