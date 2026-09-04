const KEY_ENV = "INTEGRATION_ENCRYPTION_KEY"
const IV_BYTES = 12
const TAG_BYTES = 16

let cachedKey: CryptoKey | null = null

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey
  const raw = Deno.env.get(KEY_ENV)
  if (!raw) throw new Error(`${KEY_ENV} is not set`)
  if (!/^[0-9a-f]{64}$/.test(raw)) {
    throw new Error(`${KEY_ENV} must be 64 lowercase hex characters (32 bytes)`)
  }
  const bytes = new Uint8Array(32)
  for (let i = 0; i < 32; i++) bytes[i] = parseInt(raw.slice(i * 2, i * 2 + 2), 16)
  cachedKey = await crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"])
  return cachedKey
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function toUrlSafe(b64: string): string {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function fromUrlSafe(encoded: string): string {
  const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/")
  return b64 + "=".repeat((4 - (b64.length % 4)) % 4)
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const data = new TextEncoder().encode(plaintext)
  // Web Crypto returns ciphertext ++ tag; our wire format is iv ++ tag ++ ciphertext.
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data))
  const tag = sealed.slice(sealed.length - TAG_BYTES)
  const ciphertext = sealed.slice(0, sealed.length - TAG_BYTES)
  const out = new Uint8Array(iv.length + tag.length + ciphertext.length)
  out.set(iv, 0)
  out.set(tag, iv.length)
  out.set(ciphertext, iv.length + tag.length)
  return bytesToBase64(out)
}

export async function decrypt(payload: string): Promise<string> {
  const key = await getKey()
  const bytes = base64ToBytes(payload)
  if (bytes.length < IV_BYTES + TAG_BYTES) throw new Error("crypto: payload too short")
  const iv = bytes.subarray(0, IV_BYTES)
  const tag = bytes.subarray(IV_BYTES, IV_BYTES + TAG_BYTES)
  const ciphertext = bytes.subarray(IV_BYTES + TAG_BYTES)
  // Recombine to Web Crypto's expected ciphertext ++ tag layout.
  const sealed = new Uint8Array(ciphertext.length + tag.length)
  sealed.set(ciphertext, 0)
  sealed.set(tag, ciphertext.length)
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, sealed)
  return new TextDecoder().decode(plaintext)
}

export async function encryptOAuthState(payload: unknown): Promise<string> {
  return toUrlSafe(await encrypt(JSON.stringify(payload)))
}

export async function decryptOAuthState<T>(
  encoded: string,
  validate?: (v: unknown) => v is T,
): Promise<T | null> {
  try {
    const parsed = JSON.parse(await decrypt(fromUrlSafe(encoded))) as unknown
    if (validate && !validate(parsed)) return null
    return parsed as T
  } catch {
    return null
  }
}
