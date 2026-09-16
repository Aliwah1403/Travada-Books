// Pure types + helpers for the invoice "custom fields" feature, kept out of
// lib/queries and components so both can import without a circular
// dependency. UI lives in components/invoices/custom-fields.tsx, which
// re-exports the type + constant from here.

export type CustomField = { id: string; label: string; value: string }

export const MAX_CUSTOM_FIELDS = 8

// Trims label/value and drops any entry missing either — stored data is
// exactly what renders, so there's no such thing as a "half-filled" saved
// field.
export function normalizeCustomFields(fields: CustomField[]): CustomField[] {
  return fields
    .map((f) => ({ id: f.id, label: f.label.trim(), value: f.value.trim() }))
    .filter((f) => f.label && f.value)
    .slice(0, MAX_CUSTOM_FIELDS)
}

// Defensive parse of the jsonb column coming back from Supabase — never
// trust the shape of data read off the wire.
export function parseCustomFields(raw: unknown): CustomField[] {
  if (!Array.isArray(raw)) return []
  const out: CustomField[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue
    const label = (entry as Record<string, unknown>).label
    const value = (entry as Record<string, unknown>).value
    if (typeof label !== "string" || typeof value !== "string") continue
    const id = (entry as Record<string, unknown>).id
    out.push({ id: typeof id === "string" && id ? id : crypto.randomUUID(), label, value })
  }
  return out.slice(0, MAX_CUSTOM_FIELDS)
}

// Builds editor-ready fields (empty values) from an org's default label list,
// e.g. to prefill a new invoice from invoice_templates.custom_field_labels.
export function fieldsFromLabels(labels: string[]): CustomField[] {
  return labels.slice(0, MAX_CUSTOM_FIELDS).map((label) => ({
    id: crypto.randomUUID(),
    label,
    value: "",
  }))
}
