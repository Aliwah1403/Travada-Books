import type { AppType } from "@travada-books/api/client";
import { type ApiErrorBody, type ApiErrorCode, isApiErrorBody } from "@travada-books/core";
import { hc } from "hono/client";
import posthog from "posthog-js";
import { supabase } from "@/lib/supabase";

// Typed client for apps/api (API-WRITES-PLAN.md D1). Route types come from
// the API's generated declarations (`npm run build:types -w @travada-books/api`),
// so a renamed route or changed response shape fails the app's typecheck.
//
// Writes move here domain by domain behind flags (lib/api-flags.ts); reads
// mostly stay on supabase-js. Query keys and invalidations don't change.

const API_URL: string =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:8787" : "");

// The org the app is working in, kept in step by AuthProvider. Sent as
// X-Org-Id so the API acts on the org on screen — not whatever active_org_id
// says at that moment — and can cache the membership check.
let currentOrgId: string | null = null;
export function setApiOrgId(orgId: string | null) {
  currentOrgId = orgId;
}

export const api = hc<AppType>(API_URL, {
  // The user's Supabase session is the API's login too.
  headers: async (): Promise<Record<string, string>> => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    // Lets the API compute "today" (overdue checks, reopen status) in the
    // user's timezone rather than the server's.
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tz ? { "X-User-Timezone": tz } : {}),
      ...(currentOrgId ? { "X-Org-Id": currentOrgId } : {}),
    };
  },
});

/** A failed API call, carrying the shared error code (and field, if any). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly field?: string;

  constructor(status: number, body: ApiErrorBody) {
    super(body.error);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
    this.field = body.field;
  }
}

type JsonResponse<T> = { ok: boolean; status: number; json(): Promise<T> };

/**
 * Awaits an `api.…$get()/$post()` call and returns the success body, or throws
 * an ApiError. Use it in mutationFn/queryFn so React Query and toast.promise
 * see errors the same way they see Supabase errors today.
 */
export async function unwrap<T>(request: Promise<JsonResponse<T>>): Promise<Exclude<T, ApiErrorBody>> {
  let res: JsonResponse<T>;
  try {
    res = await request;
  } catch {
    throw new ApiError(0, { error: "Couldn't reach Travada. Check your connection and try again.", code: "INTERNAL" });
  }
  const body = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    throw new ApiError(
      res.status,
      isApiErrorBody(body) ? body : { error: "Something went wrong. Please try again.", code: "INTERNAL" },
    );
  }
  return body as Exclude<T, ApiErrorBody>;
}

/**
 * Times a read for the API-vs-direct A/B test (API-WRITES-PLAN.md §6a).
 * Emits `query_timing` with which path served it, how long it took, and
 * whether it failed.
 */
export async function timedRead<T>(name: string, path: "api" | "direct", read: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    const result = await read();
    posthog.capture("query_timing", {
      query: name,
      path,
      duration_ms: Math.round(performance.now() - start),
      rows: Array.isArray(result) ? result.length : undefined,
      ok: true,
    });
    return result;
  } catch (error) {
    posthog.capture("query_timing", { query: name, path, duration_ms: Math.round(performance.now() - start), ok: false });
    throw error;
  }
}
