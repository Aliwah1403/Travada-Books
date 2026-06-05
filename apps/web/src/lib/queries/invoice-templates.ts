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
  payment_terms: number | null
  default_note: string | null
  default_payment_details: string | null
  cc: string
  bcc: string
  logo_url: string | null
  selected_payment_integration: string | null
  reminder_days_after_due: number | null
  invoice_number_prefix: string | null
  invoice_number_digits: number | null
}

const TEMPLATE_SELECT =
  "id, org_id, is_default, invoice_template, date_format, include_tax, show_qty_column, accept_payments, payment_terms, default_note, default_payment_details, cc, bcc, logo_url, selected_payment_integration, reminder_days_after_due, invoice_number_prefix, invoice_number_digits"

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
  const { data: existing, error: lookupError } = await supabase
    .from("invoice_templates")
    .select("id")
    .eq("org_id", orgId)
    .eq("is_default", true)
    .maybeSingle()

  if (lookupError) throw lookupError

  const payload = {
    org_id: orgId,
    is_default: true,
    invoice_template: settings.invoiceTemplate,
    date_format: settings.dateFormat,
    include_tax: settings.showTaxColumn,
    show_qty_column: settings.showQtyColumn,
    accept_payments: settings.acceptPaymentsEnabled,
    payment_terms: settings.paymentTerms,
    default_note: settings.defaultNote || null,
    default_payment_details: settings.defaultPaymentDetails || null,
    cc: settings.cc,
    bcc: settings.bcc,
    logo_url: settings.logoUrl || null,
    selected_payment_integration: settings.selectedPaymentIntegration || null,
    reminder_days_after_due: settings.reminderDaysAfterDue ?? null,
    invoice_number_prefix: settings.invoiceNumberPrefix || "INV-",
    invoice_number_digits: settings.invoiceNumberDigits ?? 4,
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
    paymentTerms: row.payment_terms ?? null,
    defaultNote: row.default_note ?? "",
    defaultPaymentDetails: row.default_payment_details ?? "",
    showTaxColumn: row.include_tax ?? false,
    showQtyColumn: row.show_qty_column ?? true,
    acceptPaymentsEnabled: row.accept_payments ?? false,
    selectedPaymentIntegration: row.selected_payment_integration ?? null,
    cc: row.cc ?? "",
    bcc: row.bcc ?? "",
    logoUrl: row.logo_url ?? null,
    reminderDaysAfterDue: (row.reminder_days_after_due as InvoiceSettings["reminderDaysAfterDue"]) ?? null,
    invoiceNumberPrefix: row.invoice_number_prefix ?? "INV-",
    invoiceNumberDigits: (([3, 4, 5] as number[]).includes(row.invoice_number_digits ?? 4)
      ? (row.invoice_number_digits ?? 4)
      : 4) as InvoiceSettings["invoiceNumberDigits"],
  }
}
