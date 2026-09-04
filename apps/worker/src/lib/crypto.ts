import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const KEY_ENV = "INTEGRATION_ENCRYPTION_KEY";
const IV_BYTES = 12;
const TAG_BYTES = 16;

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env[KEY_ENV];
  if (!raw) throw new Error(`${KEY_ENV} is not set`);
  if (!/^[0-9a-f]{64}$/.test(raw)) {
    throw new Error(`${KEY_ENV} must be 64 lowercase hex characters (32 bytes)`);
  }
  cachedKey = Buffer.from(raw, "hex");
  return cachedKey;
}

function toUrlSafe(b64: string): string {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromUrlSafe(encoded: string): string {
  const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  return b64 + "=".repeat((4 - (b64.length % 4)) % 4);
}

export async function encrypt(plaintext: string): Promise<string> {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}

export async function decrypt(payload: string): Promise<string> {
  const bytes = Buffer.from(payload, "base64");
  if (bytes.length < IV_BYTES + TAG_BYTES) throw new Error("crypto: payload too short");
  const iv = bytes.subarray(0, IV_BYTES);
  const tag = bytes.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = bytes.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export async function encryptOAuthState(payload: unknown): Promise<string> {
  return toUrlSafe(await encrypt(JSON.stringify(payload)));
}

export async function decryptOAuthState<T>(
  encoded: string,
  validate?: (v: unknown) => v is T,
): Promise<T | null> {
  try {
    const parsed = JSON.parse(await decrypt(fromUrlSafe(encoded))) as unknown;
    if (validate && !validate(parsed)) return null;
    return parsed as T;
  } catch {
    return null;
  }
}
