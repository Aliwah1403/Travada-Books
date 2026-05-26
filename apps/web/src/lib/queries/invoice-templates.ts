import { supabase } from "@/lib/supabase"
import type { InvoiceSettings } from "@/components/invoices/invoice-settings-sheet"

type InvoiceTemplateRow = {
  id: string
  org_id: string
  is_default: boolean
  invoice_template: string
  date_format: string
  include_tax: boolean
  show_qty_column: boolean
  accept_payments: boolean
  cc: string
  bcc: string
}

const TEMPLATE_SELECT =
  "id, org_id, is_default, invoice_template, date_format, include_tax, show_qty_column, accept_payments, cc, bcc"

export async function getOrgInvoiceTemplate(orgId: string): Promise<InvoiceSettings | null> {
  const { data, error } = await supabase
    .from("invoice_templates")
    .select(TEMPLATE_SELECT)
    .eq("org_id", orgId)
    .eq("is_default", true)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return rowToSettings(data)
}

export async function upsertOrgInvoiceTemplate(
  orgId: string,
  settings: InvoiceSettings,
): Promise<void> {
  const { data: existing } = await supabase
    .from("invoice_templates")
    .select("id")
    .eq("org_id", orgId)
    .eq("is_default", true)
    .maybeSingle()

  const payload = {
    org_id: orgId,
    is_default: true,
    invoice_template: settings.invoiceTemplate,
    date_format: settings.dateFormat,
    include_tax: settings.showTaxColumn,
    show_qty_column: settings.showQtyColumn,
    accept_payments: settings.acceptPaymentsEnabled,
    cc: settings.cc,
    bcc: settings.bcc,
  }

  if (existing) {
    const { error } = await supabase
      .from("invoice_templates")
      .update(payload)
      .eq("id", existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from("invoice_templates")
      .insert(payload)
    if (error) throw error
  }
}

function rowToSettings(row: InvoiceTemplateRow): InvoiceSettings {
  return {
    invoiceTemplate: row.invoice_template ?? "classic",
    dateFormat: (row.date_format as InvoiceSettings["dateFormat"]) ?? "DD/MM/YYYY",
    showTaxColumn: row.include_tax ?? false,
    showQtyColumn: row.show_qty_column ?? true,
    acceptPaymentsEnabled: row.accept_payments ?? false,
    selectedPaymentIntegration: null,
    cc: row.cc ?? "",
    bcc: row.bcc ?? "",
  }
}
