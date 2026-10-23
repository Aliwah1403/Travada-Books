// Shared helpers for the one-off Travada Systems -> Books operator scripts
// (link-systems-customers.ts, import-systems-history.ts). Not a Trigger task.
import { readFileSync, writeFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const EXTERNAL_SOURCE = "travada_systems";

// ── Env + safety rails ──────────────────────────────────────────────────────

export type ScriptEnv = {
  supabase: SupabaseClient;
  orgId: string;
  host: string;
  isLocal: boolean;
};

function fail(msg: string): never {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

/**
 * Builds the service-role client, prints the target host FIRST and refuses to
 * continue against a non-local host without --i-know-this-is-prod.
 */
export function initEnv(opts: { apply: boolean; iKnowThisIsProd: boolean }): ScriptEnv {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const orgId = process.env.SYSTEMS_BOOKS_ORG_ID;
  if (!url) fail("SUPABASE_URL is not set");

  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    fail(`SUPABASE_URL is not a valid URL: ${url}`);
  }
  const isLocal = host === "127.0.0.1" || host === "localhost" || host === "::1" || host === "[::1]";
  console.log(`Target host : ${host}${isLocal ? " (local)" : " (REMOTE)"}`);
  console.log(`Mode        : ${opts.apply ? "APPLY (writes enabled)" : "DRY RUN (no writes)"}`);

  if (!isLocal && !opts.iKnowThisIsProd) {
    fail("target is not local. Re-run with --i-know-this-is-prod if you really mean it.");
  }
  if (!key) fail("SUPABASE_SERVICE_ROLE_KEY is not set");
  if (!orgId) fail("SYSTEMS_BOOKS_ORG_ID is not set");
  console.log(`Books org   : ${orgId}`);

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return { supabase, orgId, host, isLocal };
}

/** Throws on a Supabase error with context; returns data. */
export function must<T>(res: { data: T | null; error: { message: string; code?: string } | null }, ctx: string): T {
  if (res.error) throw new Error(`${ctx}: ${res.error.message}${res.error.code ? ` [${res.error.code}]` : ""}`);
  return (res.data ?? ([] as unknown)) as T;
}

/** Pages through a select (PostgREST caps at 1000 rows per request). */
export async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  ctx: string,
): Promise<T[]> {
  const out: T[] = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const res = await build(from, from + size - 1);
    if (res.error) throw new Error(`${ctx}: ${res.error.message}`);
    const rows = res.data ?? [];
    out.push(...rows);
    if (rows.length < size) break;
  }
  return out;
}

// ── Mongo Extended JSON ─────────────────────────────────────────────────────

/** Recursively unwraps $oid / $date / $numberInt / $numberLong / $numberDouble / $numberDecimal. */
export function normalizeEjson(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(normalizeEjson);
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    const keys = Object.keys(o);
    if (keys.length === 1) {
      const k = keys[0];
      const inner = o[k];
      if (k === "$oid") return String(inner);
      if (k === "$date") {
        if (inner && typeof inner === "object" && "$numberLong" in (inner as object)) {
          return new Date(Number((inner as Record<string, unknown>).$numberLong)).toISOString();
        }
        if (typeof inner === "number") return new Date(inner).toISOString();
        return String(inner);
      }
      if (k === "$numberInt" || k === "$numberLong" || k === "$numberDouble" || k === "$numberDecimal") {
        const n = Number(inner);
        return Number.isNaN(n) ? String(inner) : n;
      }
    }
    const out: Record<string, unknown> = {};
    for (const k of keys) out[k] = normalizeEjson(o[k]);
    return out;
  }
  return v;
}

export function loadEjsonArray(path: string): Record<string, unknown>[] {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (e) {
    fail(`cannot read ${path}: ${(e as Error).message}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    fail(`${path} is not valid JSON (expected mongoexport --jsonArray): ${(e as Error).message}`);
  }
  if (!Array.isArray(parsed)) fail(`${path} must contain a JSON array (mongoexport --jsonArray)`);
  return (parsed as unknown[]).map((d) => normalizeEjson(d) as Record<string, unknown>);
}

// ── Small value helpers ─────────────────────────────────────────────────────

export function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

/** Comma/semicolon separated string or array -> trimmed, non-empty list. */
export function toList(v: unknown): string[] {
  if (v === null || v === undefined) return [];
  const arr = Array.isArray(v) ? v : [v];
  return arr
    .flatMap((x) => String(x ?? "").split(/[;,]/))
    .map((x) => x.trim())
    .filter(Boolean);
}

export function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ── CSV ─────────────────────────────────────────────────────────────────────

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function writeCsv(path: string, columns: string[], rows: Record<string, unknown>[]): void {
  const lines = [columns.map(csvCell).join(",")];
  for (const r of rows) lines.push(columns.map((c) => csvCell(r[c])).join(","));
  writeFileSync(path, lines.join("\n") + "\n", "utf8");
}

export function readCsv(path: string): Record<string, string>[] {
  const text = readFileSync(path, "utf8").replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQ = false;
      } else cell += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    if (row.some((x) => x !== "")) rows.push(row);
  }
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
}

// ── Console summary ─────────────────────────────────────────────────────────

export function printCounts(title: string, values: string[]): void {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  console.log(`\n${title}`);
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const w = Math.max(6, ...entries.map(([k]) => k.length));
  console.log(`  ${"result".padEnd(w)}  count`);
  console.log(`  ${"-".repeat(w)}  -----`);
  for (const [k, n] of entries) console.log(`  ${k.padEnd(w)}  ${String(n).padStart(5)}`);
  console.log(`  ${"total".padEnd(w)}  ${String(values.length).padStart(5)}`);
}

// ── Dates ───────────────────────────────────────────────────────────────────

/** YYYY-MM-DD in Africa/Nairobi for timestamps; plain dates pass through. */
export function toLocalDate(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function addMonthsISO(date: string, months: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, d));
  return dt.toISOString().slice(0, 10);
}

export function addDaysISO(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
