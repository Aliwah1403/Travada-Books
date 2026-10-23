import * as z from "zod"

const emailSchema = z.string().email()

// Splits a comma/semicolon/newline separated list of emails, trimmed, empties dropped.
export function splitEmailList(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(/[,;\n]/)
    .map((e) => e.trim())
    .filter(Boolean)
}

export function isValidEmailList(value: string | null | undefined): boolean {
  return splitEmailList(value).every((e) => emailSchema.safeParse(e).success)
}

// Normalizes to "a@x.com, b@y.com" (empty string when nothing is set).
export function normalizeEmailList(value: string | null | undefined): string {
  return splitEmailList(value).join(", ")
}
