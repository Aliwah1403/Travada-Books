import { schedules, logger, retry } from "@trigger.dev/sdk";
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

    const fetched = await Promise.all(
      CURRENCIES.map(async (base) => {
        const res = await retry.fetch(`${API_BASE}/${base.toLowerCase()}.json`, {
          retry: {
            maxAttempts: 3,
            condition: (response) =>
              response !== undefined && (response.status === 429 || response.status >= 500),
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${base}`);
        const json = await res.json();
        return { base, rates: json[base.toLowerCase()] as Record<string, number> };
      }),
    );

    const rows: { base: string; target: string; rate: number; updated_at: string }[] = [];
    const now = new Date().toISOString();

    for (const { base, rates } of fetched) {
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
