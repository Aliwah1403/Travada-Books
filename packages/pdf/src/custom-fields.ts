// Display-time normalization for invoice/quote custom fields, used by the PDF
// templates. This is a deliberate copy of the trim/filter/cap logic in
// apps/app/src/lib/custom-fields.ts (kept separate so this package never
// imports from apps/app — see DOCUMENT-PDF-PLAN.md Phase 1). Parsing the raw
// jsonb column (parseCustomFields) stays app-side and is done before calling
// the mappers in this package; only the pure display-normalization step is
// duplicated here.
import type { CustomField } from "./types";

const MAX_CUSTOM_FIELDS = 8;

export function normalizeCustomFields(fields: CustomField[]): CustomField[] {
  return fields
    .map((f) => ({ id: f.id, label: f.label.trim(), value: f.value.trim() }))
    .filter((f) => f.label && f.value)
    .slice(0, MAX_CUSTOM_FIELDS);
}

// Defensive parse of the jsonb `custom_fields` column, used by the Node
// server entry (./server.ts) where a raw DB row is passed in directly. This
// is a copy of parseCustomFields in apps/app/src/lib/custom-fields.ts — see
// the note at the top of this file.
export function parseCustomFields(raw: unknown): CustomField[] {
  if (!Array.isArray(raw)) return [];
  const out: CustomField[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const label = (entry as Record<string, unknown>).label;
    const value = (entry as Record<string, unknown>).value;
    if (typeof label !== "string" || typeof value !== "string") continue;
    const id = (entry as Record<string, unknown>).id;
    out.push({ id: typeof id === "string" && id ? id : crypto.randomUUID(), label, value });
  }
  return out.slice(0, MAX_CUSTOM_FIELDS);
}
