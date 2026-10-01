// Phase 1 smoke test for @travada-books/pdf's Node server entry — proves
// invoice/quote/statement PDFs render correctly under plain Node (no
// dev server, no Trigger.dev run) before the worker ever calls this code
// for real in Phase 2. See DOCUMENT-PDF-PLAN.md.
//
// Usage:
//   npx tsx apps/worker/scripts/render-pdf-smoke.ts [outDir]
// outDir defaults to ./.smoke-out (relative to cwd), which is gitignored.

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  renderInvoicePdf,
  renderQuotePdf,
  renderStatementPdf,
  type InvoicePdfRow,
  type QuotePdfRow,
  type StatementPdfRow,
} from "@travada-books/pdf/server";
import {
  buildStatementLedger,
  formatServerDate,
  resolveDateFnsPattern,
  type StatementLedgerInvoice,
} from "@travada-books/pdf";

const outDir = resolve(process.cwd(), process.argv[2] ?? "./.smoke-out");

// A stable, publicly hosted PNG. Probed first (short timeout) so the smoke
// test still passes — logo simply omitted — when run offline.
const LOGO_URL = "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png";

async function probeLogoUrl(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { method: "GET", signal: controller.signal });
    clearTimeout(timeout);
    return res.ok ? url : null;
  } catch {
    return null;
  }
}

const fromDetails = (logoUrl: string | null) => ({
  name: "Travada Coffee Roasters Ltd",
  logo_url: logoUrl,
  address_line1: "14 Riverside Drive",
  address_line2: "Westlands",
  city: "Nairobi",
  zip: "00100",
  country: "Kenya",
  country_code: "KE",
  phone: "+254 700 123 456",
  email: "hello@travadacoffee.example",
  billing_email: null,
  tax_id: "P051234567X",
});

const customerDetails = {
  name: "Acme Distributors Ltd",
  logo_url: null,
  address_line1: "88 Mombasa Road",
  address_line2: null,
  city: "Mombasa",
  zip: "80100",
  country: "Kenya",
  country_code: "KE",
  phone: "+254 722 987 654",
  email: "accounts@acmedistributors.example",
  billing_email: "billing@acmedistributors.example",
  tax_id: null,
};

const lineItems = [
  { description: "Arabica AA — 1kg bags (case of 12)", quantity: 20, price: 4200, tax_rate: 16 },
  { description: "Robusta blend — 1kg bags (case of 12)", quantity: 10, price: 3100, tax_rate: 16 },
  { description: "Espresso machine servicing", quantity: 1, price: 8500, tax_rate: 16 },
];

const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.price, 0);
const taxAmount = lineItems.reduce((s, i) => s + i.quantity * i.price * (i.tax_rate / 100), 0);
const discount = Math.round(subtotal * 0.05); // 5% discount, realistic fixture value
const total = subtotal + taxAmount - discount;

const customFields = [
  { label: "PO Number", value: "PO-2026-0417" },
  { label: "Delivery Route", value: "Mombasa Road — Tue/Fri" },
];

async function main() {
  await mkdir(outDir, { recursive: true });
  const logoUrl = await probeLogoUrl(LOGO_URL);
  console.log(logoUrl ? `Logo probe OK — embedding ${LOGO_URL}` : "Logo probe failed/offline — rendering without a logo");

  const invoiceRow: InvoicePdfRow = {
    invoice_number: "INV-2026-0417",
    currency: "KES",
    issue_date: "2026-09-01",
    due_date: "2026-09-15",
    line_items: lineItems,
    subtotal,
    tax_amount: taxAmount,
    discount,
    total,
    note: "Thank you for your business. Payment due within 14 days of the invoice date.",
    payment_details: "M-Pesa Paybill 400200, Account: TRAVADA-COFFEE",
    from_details: fromDetails(logoUrl),
    customer_details: customerDetails,
    customer_name: customerDetails.name,
    custom_fields: customFields,
  };

  const quoteRow: QuotePdfRow = {
    quote_number: "QUO-2026-0093",
    currency: "KES",
    issue_date: "2026-09-01",
    valid_until: "2026-09-30",
    line_items: lineItems,
    subtotal,
    tax_amount: taxAmount,
    discount,
    total,
    note: "Prices valid for 30 days. Delivery within 5 business days of order confirmation.",
    from_details: fromDetails(logoUrl),
    customer_details: customerDetails,
    customer_name: customerDetails.name,
    custom_fields: customFields,
  };

  // Exercises buildStatementLedger — the same builder
  // apps/worker/src/trigger/generate-document-pdf.ts uses for real —
  // instead of hand-authoring pre-formatted ledger entries. Mirrors a
  // partially paid invoice (145,600 issued, 100,000 received to date) plus
  // a second, fully unpaid invoice, matching the fixture's original
  // hand-built entries.
  const statementSnapshot: StatementLedgerInvoice[] = [
    {
      invoice_number: "INV-2026-0398",
      status: "partially_paid",
      issue_date: "2026-08-05",
      total: 145600,
      paid_at: null,
      amount_paid: 100000,
    },
    {
      invoice_number: "INV-2026-0405",
      status: "unpaid",
      issue_date: "2026-08-20",
      total,
      paid_at: null,
      amount_paid: 0,
    },
  ];

  // The worker has no per-viewer profile/timezone — it formats with the
  // org's default invoice_templates.date_format (see resolveDateFnsPattern).
  const datePattern = resolveDateFnsPattern("DD/MM/YYYY");
  const formatDate = (value: string) => formatServerDate(value, datePattern);

  const statementDateTo = "2026-08-31";
  const ledgerEntries = buildStatementLedger(statementSnapshot, {
    dateTo: statementDateTo,
    formatDate,
  });

  const expectedClosingBalance = 45600 + total;
  const actualClosingBalance = ledgerEntries.at(-1)?.balance;
  if (ledgerEntries.length !== 3 || actualClosingBalance !== expectedClosingBalance) {
    throw new Error(
      `buildStatementLedger produced unexpected output: ${ledgerEntries.length} entries, ` +
        `closing balance ${actualClosingBalance} (expected 3 entries, balance ${expectedClosingBalance})`,
    );
  }
  console.log(`Statement ledger builder OK — ${ledgerEntries.length} entries, closing balance ${actualClosingBalance.toLocaleString()}`);

  const statementRow: StatementPdfRow = {
    from_details: fromDetails(logoUrl),
    customer_details: customerDetails,
    currency: "KES",
    statementDate: formatDate("2026-09-01"),
    dateFrom: formatDate("2026-08-01"),
    dateTo: formatDate(statementDateTo),
    notes: "Please settle the outstanding balance within 7 days.",
    entries: ledgerEntries,
  };

  const results: Array<{ name: string; bytes: number }> = [];

  const invoiceBuffer = await renderInvoicePdf(invoiceRow, {
    publicUrl: "https://app.travadabooks.com/i/smoke-test-token",
  });
  await writeFile(resolve(outDir, "invoice.pdf"), invoiceBuffer);
  results.push({ name: "invoice.pdf", bytes: invoiceBuffer.byteLength });

  const quoteBuffer = await renderQuotePdf(quoteRow, {
    publicUrl: "https://app.travadabooks.com/q/smoke-test-token",
  });
  await writeFile(resolve(outDir, "quote.pdf"), quoteBuffer);
  results.push({ name: "quote.pdf", bytes: quoteBuffer.byteLength });

  const statementBuffer = await renderStatementPdf(statementRow, {
    publicUrl: "https://app.travadabooks.com/s/smoke-test-token",
  });
  await writeFile(resolve(outDir, "statement.pdf"), statementBuffer);
  results.push({ name: "statement.pdf", bytes: statementBuffer.byteLength });

  // Decision 2026-09-24 #2: a WebP logo (react-pdf can't decode it) or an
  // unreachable logo URL must never fail the render or leak the raw URL
  // through — the invoice must render with no logo instead. These two cases
  // exercise resolveLogoDataUrl's webp check and its fetch-failure fallback
  // directly (no pre-probing — the render itself must tolerate both).
  console.log("\nTesting logo failure resilience (webp + unreachable)...");

  const webpLogoInvoice: InvoicePdfRow = {
    ...invoiceRow,
    invoice_number: "INV-2026-0417-WEBP-LOGO",
    from_details: fromDetails("https://www.gstatic.com/webp/gallery/1.webp"),
  };
  const webpBuffer = await renderInvoicePdf(webpLogoInvoice, {
    publicUrl: "https://app.travadabooks.com/i/smoke-webp-logo",
  });
  await writeFile(resolve(outDir, "invoice-webp-logo.pdf"), webpBuffer);
  results.push({ name: "invoice-webp-logo.pdf", bytes: webpBuffer.byteLength });

  const unreachableLogoInvoice: InvoicePdfRow = {
    ...invoiceRow,
    invoice_number: "INV-2026-0417-UNREACHABLE-LOGO",
    // Port 1 refuses connections immediately — deterministic failure, no
    // network dependency and no hang.
    from_details: fromDetails("http://127.0.0.1:1/unreachable-logo.png"),
  };
  const unreachableBuffer = await renderInvoicePdf(unreachableLogoInvoice, {
    publicUrl: "https://app.travadabooks.com/i/smoke-unreachable-logo",
  });
  await writeFile(resolve(outDir, "invoice-unreachable-logo.pdf"), unreachableBuffer);
  results.push({ name: "invoice-unreachable-logo.pdf", bytes: unreachableBuffer.byteLength });

  console.log(`\nWrote ${results.length} PDFs to ${outDir}:`);
  for (const r of results) {
    if (r.bytes === 0) throw new Error(`${r.name} rendered to 0 bytes`);
    console.log(`  ${r.name}: ${r.bytes.toLocaleString()} bytes`);
  }
  console.log("\nSmoke test passed.");
}

main().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exitCode = 1;
});
