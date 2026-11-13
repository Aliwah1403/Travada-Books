import type { ApiErrorBody, ApiErrorCode } from "@travada-books/core"
import type { ContentfulStatusCode } from "hono/utils/http-status"

/**
 * An expected failure in a service: the message is safe to show the user.
 * Routes turn it into an ApiErrorBody response; MCP tools into a tool error.
 */
export class ServiceError extends Error {
  readonly status: ContentfulStatusCode
  readonly code: ApiErrorCode
  readonly field?: string

  constructor(status: ContentfulStatusCode, code: ApiErrorCode, message: string, field?: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause })
    this.status = status
    this.code = code
    this.field = field
  }

  toBody(): ApiErrorBody {
    return { error: this.message, code: this.code, ...(this.field ? { field: this.field } : {}) }
  }
}

/** Postgres error code, whether thrown by postgres.js directly or wrapped by Drizzle. */
export function pgErrorCode(error: unknown): string | undefined {
  const direct = (error as { code?: unknown })?.code
  if (typeof direct === "string" && /^[0-9A-Z]{5}$/.test(direct)) return direct
  const cause = (error as { cause?: { code?: unknown } })?.cause?.code
  return typeof cause === "string" ? cause : undefined
}

/** Postgres constraint name, for telling unique violations apart. */
export function pgConstraint(error: unknown): string | undefined {
  const e = error as { constraint_name?: string; cause?: { constraint_name?: string } }
  return e?.constraint_name ?? e?.cause?.constraint_name
}

/**
 * Maps database errors a user can cause to ServiceErrors; anything else is
 * returned unchanged (and becomes a 500). Domain services pass `unique` to
 * name specific unique constraints, e.g. the per-customer invoice number index.
 */
export function mapDbError(
  error: unknown,
  unique: Record<string, { code: ApiErrorCode; message: string; field?: string }> = {},
): unknown {
  switch (pgErrorCode(error)) {
    case "23505": {
      const known = unique[pgConstraint(error) ?? ""]
      return known
        ? new ServiceError(409, known.code, known.message, known.field)
        : new ServiceError(409, "CONFLICT", "That already exists.")
    }
    case "23503":
      return new ServiceError(422, "VALIDATION_FAILED", "Something this refers to doesn't exist.")
    case "23514":
    case "22P02":
      return new ServiceError(422, "VALIDATION_FAILED", "Some of the values aren't allowed.")
    default:
      return error
  }
}
