import { createHash } from "node:crypto";
import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);
export const FROM_EMAIL = "noreply@mail.travadasys.com";

/** PII hygiene: never log raw emails. */
export function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

// Resend 4xx error names — non-transient, never worth retrying.
const CLIENT_ERROR_NAMES = new Set([
  "missing_required_field",
  "invalid_idempotency_key",
  "invalid_idempotent_request",
  "invalid_access",
  "invalid_parameter",
  "invalid_region",
  "missing_api_key",
  "invalid_api_Key",
  "invalid_from_address",
  "validation_error",
  "not_found",
]);

export function isResendClientError(name: string): boolean {
  return CLIENT_ERROR_NAMES.has(name);
}
