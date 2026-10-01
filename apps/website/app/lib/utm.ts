// UTM/ref passthrough into the app signup link. Captured once on first page
// load (see ~/components/analytics.tsx) into sessionStorage so they survive
// client-side navigation, then appended to SIGNUP_URL after hydration (see
// ~/components/app-link.tsx) — the prerendered HTML keeps the plain
// SIGNUP_URL href so there's no hydration mismatch.
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const
const REF_KEY = "ref"
const STORAGE_KEY = "travada_utm_params"

type StoredParams = Record<string, string>

function readStoredParams(): StoredParams {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredParams) : {}
  } catch {
    return {}
  }
}

function writeStoredParams(params: StoredParams) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(params))
  } catch {
    // sessionStorage unavailable (private mode, blocked storage, etc.) — the
    // params just won't survive navigation, which is fine.
  }
}

/** Reads utm_* and ref off the current URL and stores whatever's present. */
export function captureUtmParams() {
  if (typeof window === "undefined") return

  const search = new URLSearchParams(window.location.search)
  const found: StoredParams = {}

  for (const key of UTM_KEYS) {
    const value = search.get(key)
    if (value) found[key] = value
  }
  const ref = search.get(REF_KEY)
  if (ref) found[REF_KEY] = ref

  if (Object.keys(found).length === 0) return
  writeStoredParams({ ...readStoredParams(), ...found })
}

/** Appends stored + current-URL utm/ref params onto a base URL. */
export function appendStoredParams(baseUrl: string): string {
  if (typeof window === "undefined") return baseUrl

  const stored = readStoredParams()
  const current = new URLSearchParams(window.location.search)
  const params = new URLSearchParams()

  for (const key of UTM_KEYS) {
    const value = current.get(key) ?? stored[key]
    if (value) params.set(key, value)
  }
  const ref = current.get(REF_KEY) ?? stored[REF_KEY]
  if (ref) params.set(REF_KEY, ref)

  const query = params.toString()
  if (!query) return baseUrl
  return `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}${query}`
}
