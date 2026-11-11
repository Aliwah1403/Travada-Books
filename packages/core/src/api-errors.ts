// The error body every /v1 route returns, shared by the API (which sends it)
// and the app (which shows it). `code` lets the app react to specific cases —
// e.g. INVOICE_NUMBER_TAKEN puts an inline error on the number input instead
// of a toast — and `field` names the input it belongs to.

export const API_ERROR_CODES = [
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION_FAILED",
  "CONFLICT",
  "INVALID_STATE",
  "INVOICE_NUMBER_TAKEN",
  "QUOTE_NUMBER_TAKEN",
  "RATE_LIMITED",
  "INTERNAL",
] as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[number]

export type ApiErrorBody = {
  error: string
  code: ApiErrorCode
  field?: string
}

export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (!value || typeof value !== "object") return false
  const v = value as Record<string, unknown>
  return typeof v.error === "string" && typeof v.code === "string" && (API_ERROR_CODES as readonly string[]).includes(v.code)
}
