// ISO-2 country code (as stored on `customers.country_code` / `organizations.country_code`)
// -> international calling code. Kenya-first market plus common neighbours/partners.
const CALLING_CODES: Record<string, string> = {
  KE: "254",
  UG: "256",
  TZ: "255",
  RW: "250",
  BI: "257",
  ET: "251",
  SS: "211",
  SO: "252",
  NG: "234",
  GH: "233",
  ZA: "27",
  US: "1",
  GB: "44",
  IN: "91",
  AE: "971",
}

const KNOWN_CODES = Object.values(CALLING_CODES)

/**
 * Resolves a phone number into a digits-only international number suitable
 * for wa.me, or null when it can't be resolved with confidence. Never
 * guesses a country when the number is ambiguous (e.g. a bare local number
 * with no country context) — a wrong wa.me link is worse than none.
 */
export function toWhatsappNumber(
  phone: string | null | undefined,
  countryCode: string | null | undefined,
): string | null {
  if (!phone) return null
  const trimmed = phone.trim()
  if (!trimmed) return null

  // Strip spaces, dashes, parens, dots but keep a leading "+" as a marker.
  const cleaned = trimmed.replace(/[\s\-().]/g, "")

  let digits: string
  if (cleaned.startsWith("+")) {
    digits = cleaned.slice(1).replace(/\D/g, "")
  } else {
    digits = cleaned.replace(/\D/g, "")
    if (digits.startsWith("00")) {
      digits = digits.slice(2)
    } else if (digits.startsWith("0")) {
      const callingCode = countryCode ? CALLING_CODES[countryCode.trim().toUpperCase()] : undefined
      if (!callingCode) return null
      digits = callingCode + digits.slice(1)
    } else if (!KNOWN_CODES.some((code) => digits.startsWith(code))) {
      // Bare number that doesn't already start with a known calling code —
      // we can't tell if it's missing the code entirely or just a weird
      // local format, so don't guess.
      return null
    }
  }

  if (digits.length < 8 || digits.length > 15) return null
  return digits
}

/** Builds a wa.me link. With no resolvable number, omits it so WhatsApp lets
 * the user pick a contact themselves rather than failing silently. */
export function buildWhatsappUrl(phoneDigits: string | null, text: string): string {
  const encodedText = encodeURIComponent(text)
  return phoneDigits ? `https://wa.me/${phoneDigits}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`
}
