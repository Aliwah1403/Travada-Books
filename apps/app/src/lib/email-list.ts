import * as z from "zod"

const emailSchema = z.string().email()

// Splits a comma/semicolon/newline separated list of emails, trimmed, empties dropped.
export function splitEmailList(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(/[,;\n]/)
    .map((e) => e.trim())
    .filter(Boolean)
}

// Blank is valid (no CC); separators with no addresses (", ;") are not.
export function isValidEmailList(value: string | null | undefined): boolean {
  if (!(value ?? "").trim()) return true
  const emails = splitEmailList(value)
  return emails.length > 0 && emails.every((e) => emailSchema.safeParse(e).success)
}

// Normalizes to "a@x.com, b@y.com" (empty string when nothing is set).
export function normalizeEmailList(value: string | null | undefined): string {
  return splitEmailList(value).join(", ")
}
