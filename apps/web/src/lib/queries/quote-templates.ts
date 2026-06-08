import { supabase } from "@/lib/supabase"
import type { QuoteSettings } from "@/components/quotes/quote-settings-sheet"

type QuoteTemplateRow = {
  id: string
  org_id: string
  is_default: boolean
  quote_template: string
  default_note: string | null
  cc: string
  bcc: string
  validity_days: number | null
  quote_number_prefix: string | null
  quote_number_digits: number | null
}

const TEMPLATE_SELECT =
  "id, org_id, is_default, quote_template, default_note, cc, bcc, validity_days, quote_number_prefix, quote_number_digits"

export async function getOrgQuoteTemplate(orgId: string): Promise<QuoteSettings | null> {
  const { data, error } = await supabase
    .from("quote_templates")
    .select(TEMPLATE_SELECT)
    .eq("org_id", orgId)
    .eq("is_default", true)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return rowToSettings(data)
}

export async function upsertOrgQuoteTemplate(
  orgId: string,
  settings: QuoteSettings,
): Promise<void> {
  const { data: existing, error: lookupError } = await supabase
    .from("quote_templates")
    .select("id")
    .eq("org_id", orgId)
    .eq("is_default", true)
    .maybeSingle()

  if (lookupError) throw lookupError

  const payload = {
    org_id: orgId,
    is_default: true,
    quote_template: settings.quoteTemplate,
    default_note: settings.defaultNote || null,
    cc: settings.cc,
    bcc: settings.bcc,
    validity_days: settings.validityDays ?? null,
    quote_number_prefix: settings.quoteNumberPrefix || "QUO-",
    quote_number_digits: settings.quoteNumberDigits ?? 4,
  }

  if (existing) {
    const { error } = await supabase
      .from("quote_templates")
      .update(payload)
      .eq("id", existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from("quote_templates")
      .insert(payload)
    if (error) throw error
  }
}

function rowToSettings(row: QuoteTemplateRow): QuoteSettings {
  return {
    quoteTemplate: row.quote_template ?? "classic",
    defaultNote: row.default_note ?? "",
    cc: row.cc ?? "",
    bcc: row.bcc ?? "",
    validityDays: row.validity_days ?? null,
    quoteNumberPrefix: row.quote_number_prefix ?? "QUO-",
    quoteNumberDigits: (([3, 4, 5] as number[]).includes(row.quote_number_digits ?? 4)
      ? (row.quote_number_digits ?? 4)
      : 4) as QuoteSettings["quoteNumberDigits"],
  }
}
