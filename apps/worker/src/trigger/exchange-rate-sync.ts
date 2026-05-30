import { schedules, logger } from "@trigger.dev/sdk/v3";
import { supabase } from "../lib/supabase";

// Africa-first + major global currencies
const CURRENCIES = [
  "KES", "TZS", "UGX", "ETB", "NGN", "GHS", "ZAR", "EGP",
  "MAD", "XOF", "XAF", "RWF", "BIF", "MWK",
  "USD", "EUR", "GBP", "JPY", "CNY", "INR",
  "AED", "SAR", "CAD", "AUD", "CHF",
];

const API_BASE =
  "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies";

export const exchangeRateSync = schedules.task({
  id: "exchange-rate-sync",
  cron: "0 2 * * *", // 2 AM UTC
  maxDuration: 300,
  queue: { concurrencyLimit: 1 },
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 30000,
    factor: 2,
    randomize: true,
  },
  run: async () => {
    logger.log("Exchange rate sync: starting", { currencies: CURRENCIES.length });

    const currencySet = new Set(CURRENCIES.map((c) => c.toLowerCase()));

    const results = await Promise.allSettled(
      CURRENCIES.map(async (base) => {
        const res = await fetch(`${API_BASE}/${base.toLowerCase()}.json`);
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${base}`);
        const json = await res.json();
        return { base, rates: json[base.toLowerCase()] as Record<string, number> };
      }),
    );

    const rows: { base: string; target: string; rate: number; updated_at: string }[] = [];
    const now = new Date().toISOString();

    for (const result of results) {
      if (result.status === "rejected") {
        logger.warn("Skipping currency fetch failure", { reason: String(result.reason) });
        continue;
      }
      const { base, rates } = result.value;
      for (const [target, rate] of Object.entries(rates)) {
        if (currencySet.has(target) && typeof rate === "number") {
          rows.push({ base, target: target.toUpperCase(), rate, updated_at: now });
        }
      }
    }

    logger.log("Exchange rate sync: upserting rows", { rows: rows.length });

    const BATCH_SIZE = 500;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const { error } = await supabase
        .from("exchange_rates")
        .upsert(rows.slice(i, i + BATCH_SIZE), { onConflict: "base,target" });
      if (error) {
        throw new Error(`Failed to upsert exchange rate batch at offset ${i}: ${error.message}`);
      }
    }

    logger.log("Exchange rate sync: complete", { synced: rows.length });
    return { synced: rows.length };
  },
});
