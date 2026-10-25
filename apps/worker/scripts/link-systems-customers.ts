// One-off: link (or create) Books customers for Travada Systems organisations.
//
//   node apps/worker/scripts/link-systems-customers.ts --orgs organizations.json \
//        [--include-inactive] [--report out.csv] [--apply] [--i-know-this-is-prod]
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SYSTEMS_BOOKS_ORG_ID
// Dry run by default. See Planning/SYSTEMS-BOOKS-PRIVATE-BILLING-PLAN.md §6, §10.
import { parseArgs } from "node:util";
import {
  EXTERNAL_SOURCE,
  fetchAll,
  initEnv,
  loadEjsonArray,
  printCounts,
  str,
  toList,
  writeCsv,
} from "./systems-script-common.ts";

const { values: args } = parseArgs({
  options: {
    orgs: { type: "string" },
    "include-inactive": { type: "boolean", default: false },
    report: { type: "string", default: "./systems-link-customers-report.csv" },
    apply: { type: "boolean", default: false },
    "i-know-this-is-prod": { type: "boolean", default: false },
  },
});

if (!args.orgs) {
  console.error("Usage: link-systems-customers.ts --orgs organizations.json [--include-inactive] [--report f.csv] [--apply] [--i-know-this-is-prod]");
  process.exit(1);
}

const A2: Record<string, string> = {
  KEN: "KE", UGA: "UG", TZA: "TZ", RWA: "RW", ETH: "ET", ARE: "AE", USA: "US", GBR: "GB",
  ZAF: "ZA", NGA: "NG", GHA: "GH", IND: "IN", SAU: "SA", QAT: "QA", OMN: "OM", BHR: "BH",
  KWT: "KW", JOR: "JO", EGY: "EG",
  // a few more neighbours / common markets
  BDI: "BI", SSD: "SS", SOM: "SO", COD: "CD", ZMB: "ZM", ZWE: "ZW", MWI: "MW", MOZ: "MZ",
  AUS: "AU", CAN: "CA", DEU: "DE", FRA: "FR", NLD: "NL", CHN: "CN", PAK: "PK", LKA: "LK",
};
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function countryFor(raw: string | null): { code: string; name: string } | null {
  if (!raw) return null;
  const up = raw.toUpperCase();
  const a2 = up.length === 2 ? up : A2[up];
  if (!a2) return null;
  const name = regionNames.of(a2);
  if (!name || name === a2) return null;
  return { code: a2, name };
}

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
const emails = (...vals: unknown[]) => new Set(vals.flatMap((v) => toList(v)).map((e) => e.toLowerCase()));

type Customer = {
  id: string;
  name: string;
  email: string | null;
  billing_email: string | null;
  is_archived: boolean;
  external_source: string | null;
  external_id: string | null;
};

type Row = {
  clerk_org_id: string;
  mongo_name: string;
  action: string;
  books_customer_id: string;
  books_customer_name: string;
  notes: string;
  result: string;
  // internal
  _candidates: Customer[];
  _doc: Record<string, unknown>;
};

const env = initEnv({ apply: args.apply!, iKnowThisIsProd: args["i-know-this-is-prod"]! });
const { supabase, orgId } = env;

const docs = loadEjsonArray(args.orgs);
console.log(`Loaded ${docs.length} Mongo org documents from ${args.orgs}`);

const customers = await fetchAll<Customer>(
  (from, to) =>
    supabase
      .from("customers")
      .select("id, name, email, billing_email, is_archived, external_source, external_id")
      .eq("org_id", orgId)
      .order("created_at")
      .order("id")
      .range(from, to),
  "load customers",
);
console.log(`Loaded ${customers.length} customers of the Books org`);

const linked = new Map<string, Customer>();
for (const c of customers) {
  if (c.external_source === EXTERNAL_SOURCE && c.external_id) linked.set(c.external_id, c);
}
const unlinked = customers.filter((c) => !c.external_id);

const rows: Row[] = [];
const seen = new Set<string>();

for (const doc of docs) {
  const clerk = str(doc.organizationId) ?? "";
  const profile = (doc.profile ?? {}) as Record<string, unknown>;
  const billing = (doc.billing ?? {}) as Record<string, unknown>;
  const contacts = (billing.billing_contacts ?? {}) as Record<string, unknown>;
  const mongoName = str(profile.name) ?? "";
  const base: Row = {
    clerk_org_id: clerk, mongo_name: mongoName, action: "", books_customer_id: "",
    books_customer_name: "", notes: "", result: "", _candidates: [], _doc: doc,
  };

  if (!clerk) {
    rows.push({ ...base, action: "invalid", notes: "document has no organizationId" });
    continue;
  }
  if (seen.has(clerk)) {
    rows.push({ ...base, action: "invalid", notes: "duplicate organizationId in file; first one used" });
    continue;
  }
  seen.add(clerk);

  if (billing.active === false && !args["include-inactive"]) {
    rows.push({ ...base, action: "skipped_inactive", notes: "billing.active is false (use --include-inactive)" });
    continue;
  }

  const already = linked.get(clerk);
  if (already) {
    rows.push({ ...base, action: "already_linked", books_customer_id: already.id, books_customer_name: already.name });
    continue;
  }

  const wantName = norm(mongoName);
  const wantEmails = emails(profile.email, contacts.to);
  const cands = unlinked.filter((c) => {
    if (wantName && norm(c.name) === wantName) return true;
    const have = emails(c.email, c.billing_email);
    for (const e of have) if (wantEmails.has(e)) return true;
    return false;
  });

  if (cands.length === 0) {
    rows.push({ ...base, action: "create" });
  } else if (cands.length === 1) {
    const c = cands[0];
    rows.push({
      ...base, action: "match_existing", books_customer_id: c.id, books_customer_name: c.name,
      notes: c.is_archived ? "matched customer is archived" : "", _candidates: cands,
    });
  } else {
    rows.push({
      ...base, action: "ambiguous",
      books_customer_id: cands.map((c) => c.id).join(" | "),
      books_customer_name: cands.map((c) => c.name).join(" | "),
      notes: "multiple candidates; link manually", _candidates: cands,
    });
  }
}

// One Books customer must not be claimed by two Systems orgs.
const claims = new Map<string, Row[]>();
for (const r of rows) if (r.action === "match_existing") (claims.get(r.books_customer_id) ?? claims.set(r.books_customer_id, []).get(r.books_customer_id)!).push(r);
for (const [, rs] of claims) {
  if (rs.length > 1) {
    for (const r of rs) {
      r.action = "ambiguous";
      r.notes = `customer also matches ${rs.filter((x) => x !== r).map((x) => x.clerk_org_id).join(", ")}; link manually`;
    }
  }
}

// ── Apply ───────────────────────────────────────────────────────────────────

async function linkExisting(r: Row): Promise<string> {
  const res = await supabase
    .from("customers")
    .update({ external_source: EXTERNAL_SOURCE, external_id: r.clerk_org_id })
    .eq("id", r.books_customer_id)
    .eq("org_id", orgId)
    .is("external_id", null)
    .select("id");
  if (res.error) {
    if (res.error.code === "23505") return "already_linked (23505)";
    throw new Error(res.error.message);
  }
  return res.data && res.data.length ? "linked" : "no_change (customer was linked meanwhile)";
}

async function createCustomer(r: Row): Promise<string> {
  const profile = (r._doc.profile ?? {}) as Record<string, unknown>;
  const contacts = ((r._doc.billing ?? {}) as Record<string, unknown>).billing_contacts as Record<string, unknown> | undefined;
  const to = toList(contacts?.to).join(", ");
  const cc = toList(contacts?.cc).join(", ");
  const cur = str(profile.currency)?.toUpperCase();
  const country = countryFor(str(profile.country));

  const fields: Record<string, unknown> = {
    name: str(profile.name), email: str(profile.email), billing_email: str(to), billing_cc: str(cc),
    phone: str(profile.phone), address_line1: str(profile.address), city: str(profile.city),
    zip: str(profile.postal_code), vat_number: str(profile.tax_number),
    preferred_currency: cur && /^[A-Z]{3}$/.test(cur) ? cur : null,
    country_code: country?.code ?? null, country: country?.name ?? null,
  };
  const insert: Record<string, unknown> = { org_id: orgId, external_source: EXTERNAL_SOURCE, external_id: r.clerk_org_id };
  for (const [k, v] of Object.entries(fields)) if (v !== null && v !== undefined) insert[k] = v;
  if (!insert.name) return "skipped (profile.name is empty)";

  const res = await supabase.from("customers").insert(insert).select("id, name").single();
  if (res.error) {
    if (res.error.code === "23505") return "already_linked (23505)";
    throw new Error(res.error.message);
  }
  r.books_customer_id = res.data.id;
  r.books_customer_name = res.data.name;
  return "created";
}

// Notes for create rows are computed in dry-run too (country check).
for (const r of rows) {
  if (r.action !== "create") continue;
  const raw = str(((r._doc.profile ?? {}) as Record<string, unknown>).country);
  if (raw && !countryFor(raw)) r.notes = `unknown country code "${raw}": country will be left unset`;
  if (!str(((r._doc.profile ?? {}) as Record<string, unknown>).name)) r.notes = [r.notes, "profile.name empty, cannot create"].filter(Boolean).join("; ");
}

if (args.apply) {
  for (const r of rows) {
    try {
      if (r.action === "match_existing") r.result = await linkExisting(r);
      else if (r.action === "create") {
        r.result = await createCustomer(r);
      } else if (r.action === "ambiguous") r.result = "not applied (needs manual link)";
    } catch (e) {
      r.result = `ERROR: ${(e as Error).message}`;
    }
  }
}

// ── Report ──────────────────────────────────────────────────────────────────

const cols = ["clerk_org_id", "mongo_name", "action", "books_customer_id", "books_customer_name", "notes", "result"];
writeCsv(args.report!, cols, rows as unknown as Record<string, unknown>[]);

printCounts(args.apply ? "Planned actions" : "Planned actions (dry run)", rows.map((r) => r.action));
if (args.apply) printCounts("Apply results", rows.filter((r) => r.result).map((r) => r.result.replace(/\(.*\)$/, "").trim()));
console.log(`\nReport written to ${args.report}`);
if (!args.apply) console.log("Dry run: nothing was written. Re-run with --apply to write.");
const errors = rows.filter((r) => r.result.startsWith("ERROR"));
if (errors.length) {
  console.error(`\n${errors.length} row(s) failed, see report.`);
  process.exitCode = 1;
}
