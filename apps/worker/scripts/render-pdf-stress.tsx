// Renders every invoice layout against deliberately awkward documents, so
// overlap and overflow show up before a customer finds them.
//
// Usage (from apps/worker):
//   npx tsx scripts/render-pdf-stress.tsx <outDir> [layout,layout]
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import * as React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePdf, type ClassicDocumentData } from "@travada-books/pdf";

(globalThis as { React?: unknown }).React = React;

const outDir = resolve(process.cwd(), process.argv[2] ?? "./.smoke-out");
const layouts = (process.argv[3] ?? "classic,ledger,banded,mono").split(",");

const longWords =
  "Consultation, stakeholder interviews and an extremely thorough written summary of all of the findings for the leadership team across every regional office ";

const base: ClassicDocumentData = {
  label: "INVOICE",
  number: "INV-2026-052",
  currency: "KES",
  issueDate: "2026-10-14",
  secondaryDate: "2026-11-13",
  secondaryDateLabel: "Due date:",
  from: {
    name: "Acacia Studio Ltd",
    address_line1: "4th Floor, Westlands Square",
    city: "Nairobi",
    zip: "00100",
    country: "Kenya",
    phone: "+254 712 345 678",
    email: "billing@acaciastudio.co.ke",
    tax_id: "P051234567X",
  },
  customer: {
    name: "Savanna Logistics",
    address_line1: "Mombasa Road, Godown 12",
    city: "Nairobi",
    country: "Kenya",
    billing_email: "accounts@savannalogistics.com",
  },
  customerLabel: "Bill To",
  lineItems: [
    { description: "Website design", quantity: 1, price: 50000, tax_rate: 16 },
    { description: "UX workshop", quantity: 8, price: 2500, tax_rate: 16 },
  ],
  subtotal: 70000,
  taxAmount: 11200,
  discount: 0,
  total: 81200,
  note: "Payment is due within 30 days.",
  paymentDetails: "Bank: Equity Bank Kenya\nAccount no: 0123456789012",
  publicUrl: "https://app.travadabooks.com/i/sample-token",
  showQtyColumn: true,
  showTaxColumn: true,
};

const hugeMoney: ClassicDocumentData = {
  ...base,
  lineItems: [
    { description: "Website design", quantity: 1000000, price: 999999999.99, tax_rate: 16 },
    { description: "Container freight, Mombasa to Kampala", quantity: 250000.5, price: 123456789.5, tax_rate: 16 },
    { description: "Small item", quantity: 1, price: 10, tax_rate: 0 },
  ],
  subtotal: 1030864197527374.0,
  taxAmount: 164938271604379.84,
  discount: 12345678901.23,
  total: 1195790123253853.0,
};

const SCENARIOS: Record<string, ClassicDocumentData> = {
  normal: base,
  "huge-money": hugeMoney,
  "huge-text": {
    ...base,
    number: "INV-2026-ACME-INTERNATIONAL-HOLDINGS-EAST-AFRICA-000000000052",
    from: {
      ...base.from,
      name: "Acacia Creative, Digital & Strategic Consulting Partners of East and Central Africa Limited",
      address_line1: "Suite 1402, 14th Floor, The Westlands Square Office Park, Off Ring Road Parklands",
      address_line2: "Block C, Wing 4, Opposite The Old Regional Headquarters Building",
      email: "accounts.receivable.billing.department@acaciacreativeconsultingpartners.co.ke",
    },
    customer: {
      name: "Savanna Logistics, Warehousing and Cross-Border Freight Forwarding Services (Kenya, Uganda, Tanzania) Limited",
      address_line1: "Mombasa Road, Godown 12, Behind the Old Industrial Area Railway Crossing, Next to the Weighbridge",
      city: "Nairobi",
      country: "Kenya",
      billing_email: "accounts.payable.invoices.processing@savannalogisticsandfreightforwarding.com",
    },
    lineItems: [
      { description: longWords.repeat(4), quantity: 1, price: 50000, tax_rate: 16 },
      { description: "A".repeat(180), quantity: 8, price: 2500, tax_rate: 16 },
      { description: "https://example.com/projects/2026/website-relaunch/phase-one/deliverables/final-report-signed-off", quantity: 2, price: 2500, tax_rate: 16 },
    ],
    note: longWords.repeat(12),
    paymentDetails: `Bank: The Very Long Named Commercial and Development Bank of East Africa\nIBAN: ${"KE12345678".repeat(6)}\n${longWords.repeat(5)}`,
    customFields: [
      { id: "1", label: "Purchase order reference number", value: "PO-2026-ACME-INTERNATIONAL-0000000000000008841" },
      { id: "2", label: "Project", value: longWords },
      { id: "3", label: "Cost centre", value: "EA-77" },
      { id: "4", label: "Approver", value: "Regional Finance Controller, East Africa" },
    ],
  },
  "page-long-row": {
    ...base,
    lineItems: [
      { description: "Short first row", quantity: 1, price: 100, tax_rate: 16 },
      { description: longWords.repeat(60), quantity: 2, price: 200, tax_rate: 16 },
      { description: "Row after it", quantity: 3, price: 300, tax_rate: 16 },
    ],
  },
  "many-rows": {
    ...hugeMoney,
    status: "canceled",
    note: longWords.repeat(6),
    lineItems: Array.from({ length: 45 }, (_, i) => ({
      description: i % 4 === 0 ? longWords : `Phase ${i + 1} delivery`,
      quantity: (i + 1) * 1000,
      price: 12500000.75,
      tax_rate: 16,
    })),
  },
  sparse: {
    ...base,
    from: { name: "Acacia" },
    customer: { name: "Savanna" },
    lineItems: [{ description: "Retainer", quantity: 1, price: 100, tax_rate: 0 }],
    subtotal: 100,
    taxAmount: 0,
    total: 100,
    note: null,
    paymentDetails: null,
    publicUrl: null,
    showQtyColumn: false,
    showTaxColumn: false,
  },
  // Tax number: labelled, printed without payment details, and a value too
  // long for one line. `normal` covers an old snapshot with no label (PIN).
  "tax-label": {
    ...base,
    from: { ...base.from, tax_id_label: "VAT", tax_id: "GB-123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ-0123456789-ABCDEFGHIJKLMNOP" },
    paymentDetails: null,
  },
  "tax-label-gst": {
    ...base,
    from: { ...base.from, tax_id_label: "GST", tax_id: "29ABCDE1234F1Z5" },
    paymentDetails: null,
  },
  quote: {
    ...hugeMoney,
    label: "QUOTATION",
    number: "QUO-0031",
    secondaryDateLabel: "Valid until:",
    customerLabel: "Prepared For",
    paymentDetails: null,
    publicUrl: null,
  },
};

async function main() {
  await mkdir(outDir, { recursive: true });
  for (const layout of layouts) {
    for (const [name, data] of Object.entries(SCENARIOS)) {
      const buf = await renderToBuffer(<InvoicePdf data={{ ...data, template: layout }} />);
      await writeFile(resolve(outDir, `${layout}-${name}.pdf`), buf);
      console.log(`${layout}-${name}.pdf ${buf.length}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
