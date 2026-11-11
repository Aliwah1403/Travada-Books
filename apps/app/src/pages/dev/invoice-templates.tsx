import { useEffect, useState } from "react"
import { pdf } from "@react-pdf/renderer"
import { Button } from "@travada-books/ui/components/button"
import { DOCUMENT_TEMPLATES, InvoicePdf, type ClassicDocumentData } from "@travada-books/pdf"
import { InvoicePreview } from "@/components/invoice-templates"
import { EditorDocumentPreview } from "@/components/invoice-templates/editor-preview"
import { TemplateThumbnail } from "@/components/invoice-templates/thumbnail"

// Dev-only comparison page (registered behind import.meta.env.DEV in App.tsx):
// every invoice layout against the same sample documents, no data or auth.

const SAMPLE_LOGO = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="40"><rect width="36" height="36" y="2" rx="4" fill="#737373"/><text x="46" y="29" font-family="Helvetica,Arial,sans-serif" font-size="24" font-weight="700" fill="#737373">Acacia</text></svg>`,
)}`

const FULL: ClassicDocumentData = {
  label: "INVOICE",
  number: "INV-2026-052",
  currency: "KES",
  issueDate: "2026-10-14",
  secondaryDate: "2026-11-13",
  secondaryDateLabel: "Due date:",
  from: {
    name: "Acacia Studio Ltd",
    logo_url: SAMPLE_LOGO,
    address_line1: "4th Floor, Westlands Square",
    address_line2: "Ring Road Parklands",
    city: "Nairobi",
    zip: "00100",
    country_code: "Kenya",
    phone: "+254 712 345 678",
    email: "billing@acaciastudio.co.ke",
    tax_id: "P051234567X",
  },
  customer: {
    name: "Savanna Logistics",
    address_line1: "Mombasa Road, Godown 12",
    city: "Nairobi",
    zip: "00200",
    country: "Kenya",
    phone: "+254 733 000 111",
    billing_email: "accounts@savannalogistics.com",
  },
  customerLabel: "Bill To",
  lineItems: [
    { description: "Website design", quantity: 1, price: 50000, tax_rate: 16 },
    { description: "Website development", quantity: 2, price: 20000, tax_rate: 16 },
    { description: "UX workshop", quantity: 8, price: 2500, tax_rate: 16 },
    { description: "Website copywriting", quantity: 1, price: 10000, tax_rate: 16 },
  ],
  subtotal: 120000,
  taxAmount: 19200,
  discount: 5000,
  total: 134200,
  note: "Payment is due within 30 days of the invoice date.\nThank you for working with us.",
  paymentDetails:
    "Bank: Equity Bank Kenya\nAccount name: Acacia Studio Ltd\nAccount no: 0123456789012\nBranch: Westlands",
  publicUrl: "https://app.travadabooks.com/i/sample-token",
  customFields: [
    { id: "po", label: "PO number", value: "PO-8841" },
    { id: "project", label: "Project", value: "Website relaunch" },
  ],
  dateFormat: "DD/MM/YYYY",
  showQtyColumn: true,
  showTaxColumn: true,
}

const LONG_TEXT =
  "Consultation, stakeholder interviews and an extremely thorough written summary of all of the findings for the leadership team across every regional office "

const SCENARIOS: Record<string, ClassicDocumentData> = {
  Full: FULL,
  "Huge numbers": {
    ...FULL,
    lineItems: [
      { description: "Website design", quantity: 1000000, price: 999999999.99, tax_rate: 16 },
      { description: "Container freight, Mombasa to Kampala", quantity: 250000.5, price: 123456789.5, tax_rate: 16 },
      { description: "Small item", quantity: 1, price: 10, tax_rate: 0 },
    ],
    subtotal: 1030864197527374,
    taxAmount: 164938271604379.84,
    discount: 12345678901.23,
    total: 1195790123253853,
  },
  "Huge text": {
    ...FULL,
    number: "INV-2026-ACME-INTERNATIONAL-HOLDINGS-EAST-AFRICA-000000000052",
    from: {
      ...FULL.from,
      name: "Acacia Creative, Digital & Strategic Consulting Partners of East and Central Africa Limited",
      address_line1: "Suite 1402, 14th Floor, The Westlands Square Office Park, Off Ring Road Parklands",
      email: "accounts.receivable.billing.department@acaciacreativeconsultingpartners.co.ke",
    },
    customer: {
      name: "Savanna Logistics, Warehousing and Cross-Border Freight Forwarding Services (Kenya, Uganda, Tanzania) Limited",
      address_line1: "Mombasa Road, Godown 12, Behind the Old Industrial Area Railway Crossing",
      city: "Nairobi",
      country: "Kenya",
      billing_email: "accounts.payable.invoices.processing@savannalogisticsandfreightforwarding.com",
    },
    lineItems: [
      { description: LONG_TEXT.repeat(4), quantity: 1, price: 50000, tax_rate: 16 },
      { description: "A".repeat(180), quantity: 8, price: 2500, tax_rate: 16 },
      { description: "https://example.com/projects/2026/website-relaunch/phase-one/deliverables/final-report", quantity: 2, price: 2500, tax_rate: 16 },
    ],
    note: LONG_TEXT.repeat(8),
    paymentDetails: `IBAN: ${"KE12345678".repeat(6)}\n${LONG_TEXT.repeat(3)}`,
    customFields: [
      { id: "1", label: "Purchase order reference number", value: "PO-2026-ACME-INTERNATIONAL-0000000000000008841" },
      { id: "2", label: "Project", value: LONG_TEXT },
    ],
  },
  // No logo, tax, notes or payment details: what a brand new org sends.
  Sparse: {
    ...FULL,
    from: { name: "Acacia Studio Ltd", email: "billing@acaciastudio.co.ke" },
    customer: { name: "Savanna Logistics" },
    lineItems: [{ description: "Consulting retainer, October", quantity: 1, price: 75000, tax_rate: 0 }],
    subtotal: 75000,
    taxAmount: 0,
    discount: 0,
    total: 75000,
    note: null,
    paymentDetails: null,
    publicUrl: null,
    customFields: null,
    showTaxColumn: false,
    showQtyColumn: false,
  },
  Quote: {
    ...FULL,
    label: "QUOTATION",
    number: "QUO-0031",
    secondaryDateLabel: "Valid until:",
    customerLabel: "Prepared For",
    paymentDetails: null,
    publicUrl: null,
  },
  "Long items": {
    ...FULL,
    from: { ...FULL.from, logo_url: null, name: "Acacia Creative & Digital Consulting Partners Ltd" },
    status: "canceled",
    lineItems: Array.from({ length: 14 }, (_, i) => ({
      description:
        i % 3 === 0
          ? `Phase ${i + 1}: discovery, stakeholder interviews and a written summary of the findings for the leadership team`
          : `Phase ${i + 1} delivery`,
      quantity: i + 1,
      price: 12500,
      tax_rate: 16,
    })),
    subtotal: 1312500,
    taxAmount: 210000,
    discount: 0,
    total: 1522500,
  },
}

export function Component() {
  const [layout, setLayout] = useState<string>(DOCUMENT_TEMPLATES[1].id)
  const [scenario, setScenario] = useState("Full")
  const [showPdf, setShowPdf] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const data = SCENARIOS[scenario] ?? FULL

  useEffect(() => {
    if (!showPdf) return
    let url: string | null = null
    let cancelled = false
    setPdfUrl(null)
    pdf(<InvoicePdf data={{ ...data, template: layout }} />)
      .toBlob()
      .then((blob) => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setPdfUrl(url)
      })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [showPdf, data, layout])

  return (
    <div className="min-h-svh bg-muted/40 p-4 sm:p-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {DOCUMENT_TEMPLATES.map((l) => (
            <Button
              key={l.id}
              size="sm"
              variant={layout === l.id ? "default" : "outline"}
              onClick={() => setLayout(l.id)}
            >
              {l.label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => setShowPdf((v) => !v)}>
            {showPdf ? "Show preview" : "Show PDF"}
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[...Object.keys(SCENARIOS), "Unsaved draft"].map((name) => (
            <Button
              key={name}
              size="sm"
              variant={scenario === name ? "secondary" : "ghost"}
              onClick={() => setScenario(name)}
            >
              {name}
            </Button>
          ))}
        </div>
        <div className="grid max-w-sm grid-cols-4 gap-2">
          {DOCUMENT_TEMPLATES.map((t) => (
            <div key={t.id} className="overflow-hidden rounded-lg border bg-card" data-thumb={t.id}>
              <div className="h-16 w-full bg-muted/50">
                <TemplateThumbnail id={t.id} />
              </div>
              <p className="border-t px-2 py-1.5 text-center text-[11px] font-medium">{t.label}</p>
            </div>
          ))}
        </div>
        {scenario === "Unsaved draft" ? (
          <EditorDocumentPreview
            kind="invoice"
            template={layout}
            number=""
            issueDate={new Date(2026, 9, 14)}
            secondaryDate={undefined}
            currency="KES"
            items={[
              { id: "1", description: "Website design", qty: "2", rate: "50000", tax: "16" },
              { id: "2", description: "", qty: "", rate: "", tax: "0" },
            ]}
            discountType="%"
            discountValue="10"
            vatRate=""
            paymentDetails=""
            notes=""
            customer={null}
            org={null}
            logoUrl={null}
            customFields={[]}
          />
        ) : showPdf ? (
          pdfUrl ? (
            <iframe title="PDF" src={pdfUrl} className="h-[85svh] w-full rounded-lg border" />
          ) : (
            <div className="h-[85svh] w-full animate-pulse rounded-lg bg-muted" />
          )
        ) : (
          <InvoicePreview data={data} invoiceTemplate={layout} />
        )}
      </div>
    </div>
  )
}
