// Splits a comma-separated email list (invoice_templates.cc/bcc, customers.billing_cc).
export function parseEmails(raw: string | null | undefined): string[] {
  return (raw ?? "").split(",").map((e) => e.trim()).filter(Boolean)
}

// Org template CC + the customer's own CC list, de-duplicated case-insensitively
// (first spelling wins), minus any address in `exclude` (the To address, BCCs).
export function mergeCcEmails(
  templateCc: string | null | undefined,
  customerCc: string | null | undefined,
  exclude: string[],
): string[] {
  const seen = new Set(exclude.map((e) => e.trim().toLowerCase()).filter(Boolean))
  const merged: string[] = []
  for (const email of [...parseEmails(templateCc), ...parseEmails(customerCc)]) {
    const key = email.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(email)
  }
  return merged
}
