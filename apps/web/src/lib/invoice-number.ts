/**
 * Increments the trailing numeric segment of an invoice number while
 * preserving the prefix and zero-padding.
 *
 * Examples:
 *   INV-0003  → INV-0004
 *   CFS/012   → CFS/013
 *   2024-001  → 2024-002
 *   007       → 008
 *
 * Returns the input unchanged if no trailing digits are found.
 */
export function incrementInvoiceNumber(last: string): string {
  const match = last.match(/^(.*?)(\d+)$/);
  if (!match) return last;
  const [, prefix, digits] = match;
  const next = String(Number(digits) + 1).padStart(digits.length, "0");
  return prefix + next;
}
