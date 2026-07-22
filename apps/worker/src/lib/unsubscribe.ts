import { createHmac } from "node:crypto";

/**
 * Builds a signed unsubscribe URL pointing at the `unsubscribe` Supabase edge function.
 * A bare `?email=` param would let anyone unsubscribe anyone, so the email is HMAC-signed
 * with the shared worker secret; the edge function verifies the signature before acting.
 */
export function buildUnsubscribeUrl(email: string): string {
  const SUPABASE_URL = process.env.SUPABASE_URL!;
  const e = Buffer.from(email).toString("base64url");
  const s = createHmac("sha256", process.env.WORKER_SHARED_SECRET!).update(email).digest("hex");
  return `${SUPABASE_URL}/functions/v1/unsubscribe?e=${e}&s=${s}`;
}
