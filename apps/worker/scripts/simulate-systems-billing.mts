// Local-only rehearsal using the real Systems billing reader and Books draft creator.
// Preview by default; --apply links the customer and creates a draft. Never sends.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { parseBillingResponse } from "../src/lib/systems-billing.ts";

const { values: args } = parseArgs({ options: {
  date: { type: "string" }, org: { type: "string" }, "clerk-org": { type: "string" },
  apply: { type: "boolean", default: false },
} });
if (!args.date || !args.org || !args["clerk-org"]) throw new Error('Usage: systems:simulate -- --date YYYY-MM-DD --org "Travada Billers" --clerk-org org_… [--apply]');
const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const systemsEnv = parseEnv(readFileSync(resolve(repo, "../Travada-Systems-Software/backend/.env"), "utf8"));
if (systemsEnv.NODE_ENV === "production" || !systemsEnv.MONGO_URL || new URL(systemsEnv.MONGO_URL).pathname !== "/logistics-dev") throw new Error("Systems must use logistics-dev, never production");
const port = systemsEnv.PORT || "5001";
if (!/^\d+$/.test(port)) throw new Error("Invalid local Systems port");
const systemsUrl = `http://localhost:${port}`;
const token = systemsEnv.BOOKS_BILLING_API_SECRET;
if (!token) throw new Error("Systems dev billing secret is missing");
const local = JSON.parse(execFileSync("supabase", ["status", "-o", "json"], { cwd: repo, stdio: ["ignore", "pipe", "ignore"] }));
if (new URL(local.API_URL).hostname !== "127.0.0.1") throw new Error("Only local Supabase is allowed");
const db = createClient(local.API_URL, local.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: orgs, error: orgError } = await db.from("organizations").select("id,name").eq("name", args.org);
if (orgError) throw orgError;
if (orgs?.length !== 1) throw new Error("Expected exactly one local Books organization with that name");
const org = orgs[0];
const { data: members, error: memberError } = await db.from("organization_members").select("user_id,role").eq("org_id", org.id).eq("status", "active").in("role", ["owner", "admin"]);
if (memberError) throw memberError;
const member = members?.find((row) => row.role === "owner") ?? members?.[0];
if (!member) throw new Error("Local Books org requires an active owner/admin");
const response = await fetch(`${systemsUrl}/internal/books/billing?date=${encodeURIComponent(args.date)}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000), redirect: "error" });
if (!response.ok) throw new Error(`Systems billing reader returned ${response.status}`);
const payload = parseBillingResponse(await response.json());
const selected = payload.orgs.find(({ org: entry }) => entry.clerk_org_id === args["clerk-org"]);
console.log(`Local Books: ${org.name} (${org.id}) | Systems: logistics-dev | Mode: ${args.apply ? "CREATE DRAFT" : "PREVIEW (no writes)"}`);
if (!selected) { console.log("This client is not due on the selected date. No draft created."); process.exit(0); }
const entry = selected.org;
if (entry.status !== "billable") { console.log(JSON.stringify(entry, null, 2)); process.exitCode = 1; }
else {
  console.log(JSON.stringify({ client: entry.customer.name, clerkOrgId: entry.clerk_org_id, billingDate: args.date, periodStart: entry.period_start, periodEndExclusive: entry.period_end, vehicles: entry.vehicle_count, totalUsd: entry.total_usd, invoiceCurrency: entry.currency }, null, 2));
  if (!args.apply) console.log("Add --apply to link this dev customer and create the draft in Books.");
  else {
    const { data: existing, error: lookupError } = await db.from("customers").select("id,is_archived").eq("org_id", org.id).eq("external_source", "travada_systems").eq("external_id", entry.clerk_org_id).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing?.is_archived) throw new Error("Linked customer is archived");
    if (!existing) {
      // Never relink an existing manually entered customer by a guessed name/email.
      const { error } = await db.from("customers").insert({ org_id: org.id, name: entry.customer.name || "Systems dev client", external_source: "travada_systems", external_id: entry.clerk_org_id });
      if (error) throw error;
    }
    Object.assign(process.env, { SUPABASE_URL: local.API_URL, SUPABASE_SERVICE_ROLE_KEY: local.SERVICE_ROLE_KEY,
      SYSTEMS_BOOKS_ORG_ID: org.id, SYSTEMS_BILLING_USER_ID: member.user_id,
      SYSTEMS_API_URL: systemsUrl, SYSTEMS_BILLING_API_SECRET: token, WORKER_SHARED_SECRET: "local-simulation-notifications-disabled" });
    const { runSystemsBilling } = await import("../src/trigger/systems-monthly-billing.ts");
    const result = await runSystemsBilling({ billingDate: args.date!, source: "manual", onlyClerkOrgIds: [entry.clerk_org_id], notify: false });
    console.log(JSON.stringify(result, null, 2));
    if (result.errors.length || result.skipped.length) process.exitCode = 1;
    console.log("Open the local Books app, select this organization, and open Invoices → Drafts. Nothing was sent.");
  }
}
