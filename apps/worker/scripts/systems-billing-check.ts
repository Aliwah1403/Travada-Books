// Run: node apps/worker/scripts/systems-billing-check.ts
import assert from "node:assert/strict";
import {
  customerPatch,
  isFxFresh,
  linesTotalCents,
  parseOrgEntry,
  toInvoiceLines,
  formatPeriod,
  type BillableOrg,
} from "../src/lib/systems-billing.ts";

const base = {
  clerk_org_id: "org_1",
  status: "billable",
  cycle: "quarterly",
  period_start: "2026-08-01",
  period_end: "2026-11-01",
  vehicle_count: 60,
  counted_at: "2026-11-01T00:00:00Z",
  usd_rate: "30.00",
  discount_eligible: true,
  discount_percent: "10",
  lines_usd: [
    { qty: 50, unit_usd: "30.00", kind: "standard" },
    { qty: 10, unit_usd: "27.00", kind: "volume_discount" },
  ],
  total_usd: "1770.00",
  currency: "USD",
  customer: { name: "Acme" },
};

// 60-vehicle example (USD, no fx)
const parsed = parseOrgEntry(base);
assert.equal(parsed.status, "billable");
const org = parsed as BillableOrg;
let lines = toInvoiceLines(org, null);
assert.deepEqual(
  lines.map((l) => [l.quantity, l.price, l.tax_rate]),
  [[50, 30, 0], [10, 27, 0]],
);
assert.equal(linesTotalCents(lines), 177000);
assert.equal(lines[0].description, "Fleet management · 1 Aug – 31 Oct 2026 (quarterly) · USD 30.00/vehicle");
assert.equal(
  lines[1].description,
  "Fleet management, volume discount (10%) · 1 Aug – 31 Oct 2026 (quarterly) · USD 27.00/vehicle",
);

// KES conversion
const kes = toInvoiceLines(org, { rate: 129.45962101 });
assert.equal(kes[0].price, 3883.79); // 30 * 129.45962101 = 3883.7886
assert.equal(kes[1].price, 3495.41); // 27 * 129.45962101 = 3495.4097
for (const l of kes) assert.equal(Math.round(l.price * 100) / 100, l.price);
assert.equal(linesTotalCents(kes), 50 * 388379 + 10 * 349541);
assert.ok(kes[0].description.endsWith("USD 30.00/vehicle @ 129.45962101"));

// period end: day before exclusive end, incl. year boundary and month ends
assert.equal(formatPeriod("2026-08-01", "2026-11-01"), "1 Aug – 31 Oct 2026");
assert.equal(formatPeriod("2026-11-01", "2027-02-01"), "1 Nov 2026 – 31 Jan 2027");
assert.equal(formatPeriod("2026-12-01", "2027-01-01"), "1 Dec – 31 Dec 2026");
assert.equal(formatPeriod("2026-09-01", "2026-10-01"), "1 Sep – 30 Sep 2026");
assert.equal(formatPeriod("2028-02-01", "2028-03-01"), "1 Feb – 29 Feb 2028");

// customerPatch drops empties
const patch = customerPatch(
  { name: "Acme", billing_email: "  ", cc: null, email: "a@b.co", phone: "", address: "1 Road", postal_code: undefined, tax_number: "P123" },
  "KES",
);
assert.deepEqual(patch, {
  name: "Acme",
  email: "a@b.co",
  address_line1: "1 Road",
  vat_number: "P123",
  preferred_currency: "KES",
});
assert.deepEqual(customerPatch({}, null), {});

// validation: malformed -> error for that org, total mismatch -> error
assert.equal(parseOrgEntry({ ...base, cycle: "weekly" }).status, "error");
assert.equal(parseOrgEntry({ ...base, total_usd: "1771.00" }).status, "error");
assert.equal(parseOrgEntry({ clerk_org_id: "o", status: "skipped", reason: "paused" }).status, "skipped");

// isFxFresh
const now = new Date("2026-11-01T04:00:00Z");
assert.equal(isFxFresh("2026-10-31T04:00:00Z", now), true);
assert.equal(isFxFresh("2026-10-30T04:00:00Z", now), true); // exactly 48h
assert.equal(isFxFresh("2026-10-30T03:59:00Z", now), false);
assert.equal(isFxFresh(null, now), false);
assert.equal(isFxFresh("2026-10-30T03:59:00Z", now, 72), true);

console.log("systems-billing checks passed");
