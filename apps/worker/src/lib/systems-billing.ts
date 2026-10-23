// Pure helpers for the Travada Systems -> Books monthly billing worker.
// No I/O here: everything is deterministic so scripts/systems-billing-check.ts can assert on it.
import { z } from "zod";

// ── Payload types ───────────────────────────────────────────────────────────

const decimalString = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .refine((v) => /^\d+(\.\d+)?$/.test(v), "expected a non-negative decimal");

const optionalText = z.string().nullish();

export const systemsCustomerSchema = z.object({
  name: optionalText,
  billing_email: optionalText,
  cc: optionalText,
  email: optionalText,
  phone: optionalText,
  address: optionalText,
  city: optionalText,
  postal_code: optionalText,
  country: optionalText,
  country_code: optionalText,
  tax_number: optionalText,
});
export type SystemsCustomer = z.infer<typeof systemsCustomerSchema>;

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

export const systemsLineSchema = z.object({
  qty: z.number().int().positive(),
  unit_usd: decimalString,
  kind: z.enum(["standard", "volume_discount"]),
});
export type SystemsLine = z.infer<typeof systemsLineSchema>;

export const billableOrgSchema = z.object({
  clerk_org_id: z.string().min(1),
  status: z.literal("billable"),
  cycle: z.enum(["monthly", "quarterly"]),
  period_start: dateString,
  period_end: dateString,
  vehicle_count: z.number().int().nonnegative(),
  counted_at: z.string().min(1),
  usd_rate: decimalString,
  discount_eligible: z.boolean(),
  discount_percent: decimalString.nullish(),
  lines_usd: z.array(systemsLineSchema).min(1),
  total_usd: decimalString,
  currency: z.string().regex(/^[A-Za-z]{3}$/).transform((c) => c.toUpperCase()),
  customer: systemsCustomerSchema,
});
export type BillableOrg = z.infer<typeof billableOrgSchema>;

export type SkippedOrg = { clerk_org_id: string; status: "skipped"; reason: string };
export type ErrorOrg = { clerk_org_id: string; status: "error"; reason: string };
export type ParsedOrg = BillableOrg | SkippedOrg | ErrorOrg;

export type ParsedBillingResponse = {
  billing_date: string;
  generated_at: string | null;
  /** Each entry is already validated; malformed ones became `error` entries. */
  orgs: { org: ParsedOrg; raw: unknown }[];
};

const envelopeSchema = z.object({
  billing_date: dateString,
  generated_at: z.string().nullish(),
  orgs: z.array(z.unknown()),
});

/** Parse the whole response. Throws only if the envelope itself is malformed. */
export function parseBillingResponse(json: unknown): ParsedBillingResponse {
  const env = envelopeSchema.parse(json);
  return {
    billing_date: env.billing_date,
    generated_at: env.generated_at ?? null,
    orgs: env.orgs.map((raw) => ({ org: parseOrgEntry(raw), raw })),
  };
}

/** A malformed entry becomes an error for that org only. */
export function parseOrgEntry(raw: unknown): ParsedOrg {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const id = typeof obj.clerk_org_id === "string" && obj.clerk_org_id ? obj.clerk_org_id : "(unknown)";
  const reason = typeof obj.reason === "string" ? obj.reason : "";

  if (obj.status === "skipped") return { clerk_org_id: id, status: "skipped", reason: reason || "skipped" };
  if (obj.status === "error") return { clerk_org_id: id, status: "error", reason: reason || "error from Systems" };
  if (obj.status !== "billable") {
    return { clerk_org_id: id, status: "error", reason: `unknown status ${JSON.stringify(obj.status)}` };
  }

  const res = billableOrgSchema.safeParse(raw);
  if (!res.success) {
    const msg = res.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join(".") || "entry"}: ${i.message}`)
      .join("; ");
    return { clerk_org_id: id, status: "error", reason: `malformed entry (${msg})` };
  }
  const org = res.data;
  if (!(org.period_end > org.period_start)) {
    return { clerk_org_id: id, status: "error", reason: "period_end must be after period_start" };
  }
  const linesCents = org.lines_usd.reduce((s, l) => s + l.qty * decimalToCents(l.unit_usd), 0);
  if (linesCents !== decimalToCents(org.total_usd)) {
    return {
      clerk_org_id: id,
      status: "error",
      reason: `total_usd ${org.total_usd} does not match lines (${centsToDecimal(linesCents)})`,
    };
  }
  return org;
}

// ── Money helpers (integer cents) ───────────────────────────────────────────

/** "27.005" -> 2701 (half-up on the third decimal). Input must be a non-negative decimal string. */
export function decimalToCents(s: string): number {
  const [whole, frac = ""] = s.trim().split(".");
  const cents = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  return frac.length > 2 && Number(frac[2]) >= 5 ? cents + 1 : cents;
}

export function centsToDecimal(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

// ── Invoice lines ───────────────────────────────────────────────────────────

export type InvoiceLineItem = { description: string; quantity: number; price: number; tax_rate: number };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "1 Aug 2026". Some ICU versions emit "Sept"; normalise to a stable 3-letter month. */
export function formatDate(d: Date): string {
  const parts = dateFmt.formatToParts(d);
  const day = parts.find((p) => p.type === "day")?.value ?? String(d.getUTCDate());
  const year = parts.find((p) => p.type === "year")?.value ?? String(d.getUTCFullYear());
  return `${day} ${MONTHS[d.getUTCMonth()]} ${year}`;
}

/** Inclusive display range from an inclusive start and EXCLUSIVE end: "1 Aug – 31 Oct 2026". */
export function formatPeriod(periodStart: string, periodEndExclusive: string): string {
  const start = parseYmd(periodStart);
  const last = parseYmd(periodEndExclusive);
  last.setUTCDate(last.getUTCDate() - 1);
  const startText = formatDate(start);
  const endText = formatDate(last);
  // Drop the start year when it matches the end year.
  return start.getUTCFullYear() === last.getUTCFullYear()
    ? `${startText.replace(/ \d{4}$/, "")} – ${endText}`
    : `${startText} – ${endText}`;
}

/**
 * Build Books line items. With `fx`, each USD unit price is converted and rounded to
 * 2 dp in the invoice currency; without it (USD) the USD price is kept.
 */
export function toInvoiceLines(
  org: Pick<BillableOrg, "lines_usd" | "period_start" | "period_end" | "cycle" | "discount_percent">,
  fx: { rate: number } | null,
): InvoiceLineItem[] {
  const period = formatPeriod(org.period_start, org.period_end);
  const pct = org.discount_percent != null ? Number(org.discount_percent) : 0;
  return org.lines_usd.map((line) => {
    const usdCents = decimalToCents(line.unit_usd);
    const priceCents = fx ? Math.round(usdCents * fx.rate) : usdCents;
    const label =
      line.kind === "volume_discount" ? `Fleet management, volume discount (${pct}%)` : "Fleet management";
    let description = `${label} · ${period} (${org.cycle}) · USD ${centsToDecimal(usdCents)}/vehicle`;
    if (fx) description += ` @ ${fx.rate}`;
    return { description, quantity: line.qty, price: priceCents / 100, tax_rate: 0 };
  });
}

/** Invoice total in minor units, from the same lines the invoice stores. */
export function linesTotalCents(lines: InvoiceLineItem[]): number {
  return lines.reduce((s, l) => s + l.quantity * Math.round(l.price * 100), 0);
}

// ── Customer sync ───────────────────────────────────────────────────────────

export type CustomerPatch = Partial<{
  name: string;
  billing_email: string;
  billing_cc: string;
  email: string;
  phone: string;
  address_line1: string;
  city: string;
  zip: string;
  country: string;
  country_code: string;
  vat_number: string;
  preferred_currency: string;
}>;

/** Maps the Systems customer block to Books columns, omitting empty values so Systems never blanks a field. */
export function customerPatch(customer: SystemsCustomer, currency: string | null | undefined): CustomerPatch {
  const map: [keyof CustomerPatch, string | null | undefined][] = [
    ["name", customer.name],
    ["billing_email", customer.billing_email],
    ["billing_cc", customer.cc],
    ["email", customer.email],
    ["phone", customer.phone],
    ["address_line1", customer.address],
    ["city", customer.city],
    ["zip", customer.postal_code],
    ["country", customer.country],
    ["country_code", customer.country_code],
    ["vat_number", customer.tax_number],
    ["preferred_currency", currency],
  ];
  const patch: CustomerPatch = {};
  for (const [key, value] of map) {
    if (typeof value === "string" && value.trim() !== "") patch[key] = value.trim();
  }
  return patch;
}

// ── FX freshness ────────────────────────────────────────────────────────────

export function isFxFresh(updatedAt: string | Date | null | undefined, now: Date, maxAgeHours = 48): boolean {
  if (!updatedAt) return false;
  const t = new Date(updatedAt).getTime();
  if (Number.isNaN(t)) return false;
  return now.getTime() - t <= maxAgeHours * 3_600_000;
}
