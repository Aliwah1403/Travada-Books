// Strips bank noise (card numbers, POS prefixes, value dates, amounts, auth
// codes, country suffixes) from a raw statement line so the enrichment model
// sees mostly the merchant. The raw line is still sent alongside — this only
// improves the signal, it never replaces the source text.
//
// "POS-PURCHASE CARD NO. 4439-1XXX-XXXX-5480 KADOOLI SUPERMARKET LLC B DUBAI:AE 21.50,AED 943422 09-08-2026 VALUE DATE:09-08-2026"
//   → "KADOOLI SUPERMARKET LLC B DUBAI"

const NOISE_PATTERNS: RegExp[] = [
  /\bVALUE\s+DATE\s*:?\s*\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/gi,
  /\bPOS[-\s]?(PURCHASE|PURCH|TXN|TRANSACTION)?\b/gi,
  /\bCARD\s*NO\.?\s*[\dX*\-\s]{8,}?(?=\s[A-Za-z]|$)/gi,
  /\b\d{4,6}[X*]{2,}[\dX*\-]*\b/gi, // masked card numbers without a "CARD NO" label
  /\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b/g, // dates
  /\b\d[\d,]*\.\d{2}\s*,?\s*[A-Z]{3}\b/g, // "21.50,AED"
  /\b[A-Z]{3}\s*\d[\d,]*\.\d{2}\b/g, // "AED 21.50"
  /:[A-Z]{2}\b/g, // ":AE" country suffix
  /(?<![\w*])\d{6,}(?![\w*])/g, // auth / terminal codes
];

export function cleanTransactionDescription(raw: string): string {
  let text = raw;
  for (const pattern of NOISE_PATTERNS) text = text.replace(pattern, " ");
  return text.replace(/\s{2,}/g, " ").replace(/^[\s\-|:,.]+|[\s\-|:,.]+$/g, "").trim();
}
