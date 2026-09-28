// Client for the `submit-support-request` Supabase edge function behind the
// /contact form. The function is public (verify_jwt = false), so no key is
// sent — just the multipart form.

const ENDPOINT = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-support-request`
  : null

export type SupportResult =
  | { ok: true; reference: string }
  | { ok: false; error: string; fields?: Record<string, string> }

export async function submitSupportRequest(body: FormData): Promise<SupportResult> {
  if (!ENDPOINT) {
    return { ok: false, error: "The contact form isn't set up yet. Please email us directly." }
  }
  try {
    const res = await fetch(ENDPOINT, { method: "POST", body })
    const data = (await res.json().catch(() => ({}))) as {
      reference?: string
      error?: string
      fields?: Record<string, string>
    }
    if (res.ok && data.reference) return { ok: true, reference: data.reference }
    return {
      ok: false,
      error: data.error ?? "Something went wrong. Please try again, or email us directly.",
      fields: data.fields,
    }
  } catch {
    return { ok: false, error: "We couldn't reach our servers. Check your connection and try again." }
  }
}
