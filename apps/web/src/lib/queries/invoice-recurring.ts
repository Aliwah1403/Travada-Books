import { supabase } from "@/lib/supabase"
import type { LineItem } from "@/lib/queries/invoices"

export type InvoiceRecurringStatus = "active" | "paused" | "completed" | "canceled"
export type InvoiceRecurringEndType = "never" | "on_date" | "after_count"
export type InvoiceRecurringFrequency = "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly"

export type InvoiceRecurring = {
  id: string
  created_at: string
  org_id: string
  user_id: string
  customer_id: string
  customer_name: string
  currency: string
  line_items: LineItem[]
  subtotal: number
  tax_amount: number
  discount: number
  total: number
  payment_details: string
  note: string
  accept_payments: boolean
  invoice_template: string
  from_details: Record<string, unknown> | null
  customer_details: Record<string, unknown> | null
  source_issue_date: string
  source_due_date: string | null
  frequency: InvoiceRecurringFrequency
  end_type: InvoiceRecurringEndType
  end_on_date: string | null
  end_after_count: number | null
  status: InvoiceRecurringStatus
  current_count: number
  failure_count: number
  next_scheduled_at: string
  upcoming_notification_sent_at: string | null
}

export type InvoiceRecurringInput = Omit<InvoiceRecurring, "id" | "created_at" | "current_count" | "failure_count" | "upcoming_notification_sent_at">

const RECURRING_SELECT = "id, created_at, org_id, user_id, customer_id, customer_name, currency, line_items, subtotal, tax_amount, discount, total, payment_details, note, accept_payments, invoice_template, from_details, customer_details, source_issue_date, source_due_date, frequency, end_type, end_on_date, end_after_count, status, current_count, failure_count, next_scheduled_at, upcoming_notification_sent_at"

export async function createInvoiceRecurring(input: InvoiceRecurringInput): Promise<InvoiceRecurring> {
  const { data, error } = await supabase
    .from("invoice_recurring")
    .insert(input)
    .select(RECURRING_SELECT)
    .single()

  if (error) throw error
  return data
}

export async function getInvoiceRecurring(id: string): Promise<InvoiceRecurring> {
  const { data, error } = await supabase
    .from("invoice_recurring")
    .select(RECURRING_SELECT)
    .eq("id", id)
    .single()

  if (error) throw error
  return data
}

export async function updateInvoiceRecurringStatus(
  id: string,
  orgId: string,
  status: InvoiceRecurringStatus,
): Promise<void> {
  const { error } = await supabase
    .from("invoice_recurring")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("org_id", orgId)

  if (error) throw error
}

export function addFrequency(dateStr: string, frequency: InvoiceRecurringFrequency): string {
  const d = new Date(dateStr + "T00:00:00Z")
  switch (frequency) {
    case "weekly":
      d.setUTCDate(d.getUTCDate() + 7)
      break
    case "biweekly":
      d.setUTCDate(d.getUTCDate() + 14)
      break
    case "monthly":
      d.setUTCMonth(d.getUTCMonth() + 1)
      break
    case "quarterly":
      d.setUTCMonth(d.getUTCMonth() + 3)
      break
    case "yearly":
      d.setUTCFullYear(d.getUTCFullYear() + 1)
      break
  }
  return d.toISOString().split("T")[0]
}
