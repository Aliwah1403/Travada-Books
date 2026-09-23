#!/usr/bin/env node
/**
 * One-off repair: convert WebP logos already stored in the org-assets bucket
 * into PNG, in place.
 *
 * Why these break: @react-pdf/image decodes JPEG, PNG and SVG only — it has no
 * WebP branch — so a WebP logo renders in the app but silently breaks every
 * invoice and statement PDF. The invoice, quote, statement and reminder emails
 * embed the same URL, and Outlook desktop doesn't render WebP either.
 *
 * New uploads can't create more: all three upload paths convert in the browser
 * (apps/app/src/lib/logo-upload.ts), and 20260923000000_org_assets_no_webp.sql
 * removes image/webp from the bucket. This script is for what's already there.
 *
 * Why IN PLACE, same path: invoices, quotes and statements snapshot the org into
 * `from_details` at send time, logo URL included. Writing the PNG to a new path
 * would leave every already-sent document pointing at the WebP. Overwriting the
 * same path keeps every existing URL valid and makes it serve a PNG, without
 * rewriting a single snapshot. The object keeps its `.webp` name; that's
 * cosmetic — react-pdf detects format from the bytes, and mail clients follow
 * the Content-Type header, which this sets to image/png.
 *
 * Checks both org logos (logos/<org>/logo.*) and invoice-template logos
 * (logos/<org>/invoice-logo.*). Querying organizations.logo_url alone would
 * miss the second kind, and any older file a snapshot still references.
 *
 * Resizing follows the browser rules: fit within 1200px, keep transparency,
 * stay under the bucket's 2 MB limit (falls back to a palette PNG, then 800px).
 *
 * Usage — dry run (default, changes nothing):
 *   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/repair-webp-logos.mjs
 *
 * Apply:
 *   ... node scripts/repair-webp-logos.mjs --apply
 *
 * Public objects are cached (max-age 3600), so a converted logo can take up to
 * an hour to replace the WebP in browsers and mail clients that already hold it.
 */

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const APPLY = process.argv.includes("--apply");
const BUCKET = "org-assets";
const BUCKET_LIMIT = 2 * 1024 * 1024;
const PAGE = 100;

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. The service-role key is needed\n" +
      "to read and overwrite objects in every org's folder.",
  );
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

/** Storage lists one folder level at a time, 100 entries per page. */
async function list(prefix) {
  const entries = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await db.storage
      .from(BUCKET)
      .list(prefix, { limit: PAGE, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`list ${prefix}: ${error.message}`);
    entries.push(...data);
    if (data.length < PAGE) return entries;
  }
}

const isWebp = (buf) =>
  buf.length >= 12 &&
  buf.toString("ascii", 0, 4) === "RIFF" &&
  buf.toString("ascii", 8, 12) === "WEBP";

const isPng = (buf) =>
  buf.length >= 8 &&
  buf[0] === 0x89 &&
  buf.toString("ascii", 1, 4) === "PNG";

async function toPng(buf) {
  const attempts = [
    { edge: 1200, palette: false },
    { edge: 1200, palette: true },
    { edge: 800, palette: true },
  ];
  for (const { edge, palette } of attempts) {
    const out = await sharp(buf)
      .resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true })
      .png({ compressionLevel: 9, palette })
      .toBuffer();
    if (out.length <= BUCKET_LIMIT) return out;
  }
  return null;
}

async function main() {
  console.log(
    `${APPLY ? "APPLY" : "DRY RUN"} — ${BUCKET} bucket at ${new URL(url).host}\n`,
  );

  // logos/ holds one folder per org; folders come back with id === null.
  const orgFolders = (await list("logos")).filter((e) => e.id === null);
  const candidates = [];
  for (const folder of orgFolders) {
    for (const file of await list(`logos/${folder.name}`)) {
      if (file.id === null) continue;
      const mime = file.metadata?.mimetype ?? "";
      if (mime === "image/webp" || file.name.toLowerCase().endsWith(".webp")) {
        candidates.push(`logos/${folder.name}/${file.name}`);
      }
    }
  }

  console.log(
    `Scanned ${orgFolders.length} org folder(s); ${candidates.length} WebP candidate(s).\n`,
  );

  let converted = 0;
  let skipped = 0;
  let failed = 0;

  for (const path of candidates) {
    const { data: blob, error: dlError } = await db.storage.from(BUCKET).download(path);
    if (dlError) {
      console.log(`  FAIL  ${path} — download: ${dlError.message}`);
      failed++;
      continue;
    }
    const buf = Buffer.from(await blob.arrayBuffer());

    // Trust the bytes, not the name or recorded mimetype.
    if (!isWebp(buf)) {
      console.log(`  skip  ${path} — named/typed WebP but the bytes aren't`);
      skipped++;
      continue;
    }

    const png = await toPng(buf);
    if (!png) {
      console.log(`  FAIL  ${path} — still over 2 MB after resizing`);
      failed++;
      continue;
    }

    const kb = (n) => `${Math.round(n / 1024)} KB`;
    if (!APPLY) {
      console.log(`  would convert  ${path}  (${kb(buf.length)} WebP → ${kb(png.length)} PNG)`);
      converted++;
      continue;
    }

    const { error: upError } = await db.storage
      .from(BUCKET)
      .upload(path, png, { contentType: "image/png", upsert: true, cacheControl: "3600" });
    if (upError) {
      console.log(`  FAIL  ${path} — upload: ${upError.message}`);
      failed++;
      continue;
    }

    // Read it back: confirm the object at this path now holds PNG bytes.
    const { data: check } = await db.storage.from(BUCKET).download(path);
    const back = check ? Buffer.from(await check.arrayBuffer()) : Buffer.alloc(0);
    if (!isPng(back)) {
      console.log(`  FAIL  ${path} — uploaded, but reads back as non-PNG`);
      failed++;
      continue;
    }

    console.log(`  converted  ${path}  (${kb(buf.length)} → ${kb(png.length)})`);
    converted++;
  }

  const verb = APPLY ? "converted" : "would convert";
  console.log(`\n${verb}: ${converted}   skipped: ${skipped}   failed: ${failed}`);
  if (!APPLY && converted > 0) console.log("Re-run with --apply to write the changes.");
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
