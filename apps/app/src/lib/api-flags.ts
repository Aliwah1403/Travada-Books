import posthog from "posthog-js";

// Per-domain switches for moving the app onto the API (API-WRITES-PLAN.md
// §7). Each domain's saves go through the API only when its flag is on, so a
// rollout starts with the "Travada Test" org, then the owner's org, then
// everyone — and turning the flag off sends the app straight back to direct
// Supabase writes.
//
// PostHog flags: `api-writes-<domain>` and `api-reads-<domain>`.
// Local override (dev and testing): VITE_API_WRITES / VITE_API_READS as a
// comma-separated list of domains, or "all". The override wins over PostHog.

export type ApiDomain =
  | "invoices"
  | "quotes"
  | "statements"
  | "customers"
  | "transactions"
  | "bills"
  | "inbox"
  | "settings";

function overrideFor(value: string | undefined, domain: ApiDomain): boolean | null {
  if (value === undefined || value.trim() === "") return null;
  const list = value.split(",").map((d) => d.trim());
  return list.includes("all") || list.includes(domain);
}

/** Should this domain's saves go through the API? */
export function apiWritesEnabled(domain: ApiDomain): boolean {
  const override = overrideFor(import.meta.env.VITE_API_WRITES, domain);
  if (override !== null) return override;
  return posthog.isFeatureEnabled(`api-writes-${domain}`) === true;
}

/** Should this domain's reads go through the API (the §6a A/B test)? */
export function apiReadsEnabled(domain: ApiDomain): boolean {
  const override = overrideFor(import.meta.env.VITE_API_READS, domain);
  if (override !== null) return override;
  return posthog.isFeatureEnabled(`api-reads-${domain}`) === true;
}
