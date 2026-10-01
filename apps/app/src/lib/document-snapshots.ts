// Shared builders for the JSONB `from_details` / `customer_details` snapshots
// written when an invoice or quote is sent/scheduled (see CLAUDE.md "JSONB
// snapshot pattern"), and for the logo shown across every invoice/quote
// preview and PDF. Previously duplicated (and drifting) across
// invoices/create.tsx, invoices/detail.tsx, quotes/create.tsx, quotes/detail.tsx.

export type OrgSnapshotSource = {
  name: string
  address_line1: string | null
  address_line2: string | null
  city: string | null
  zip: string | null
  country_code: string | null
  phone: string | null
  email: string | null
  tax_id: string | null
}

export type FromDetailsSnapshot = {
  name: string
  logo_url: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  zip: string | null
  country_code: string | null
  phone: string | null
  email: string | null
  tax_id: string | null
}

export type CustomerSnapshotSource = {
  name: string
  email?: string | null
  billing_email?: string | null
  phone?: string | null
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  zip?: string | null
  country?: string | null
}

export type CustomerDetailsSnapshot = {
  name: string
  email: string | null
  billing_email: string | null
  phone: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  zip: string | null
  country: string | null
}

// Single source of truth for "which logo does this document use": the org's
// invoice-template logo wins, falling back to the org's own logo. Used for
// every from_details snapshot and every in-app preview/PDF download for both
// invoices and quotes.
export function resolveDocumentLogo(
  templateLogoUrl: string | null | undefined,
  org: { logo_url: string | null } | null | undefined,
): string | null {
  return templateLogoUrl ?? org?.logo_url ?? null
}

export function buildFromDetailsSnapshot(
  org: OrgSnapshotSource,
  logoUrl: string | null,
): FromDetailsSnapshot {
  return {
    name: org.name,
    logo_url: logoUrl,
    address_line1: org.address_line1 ?? null,
    address_line2: org.address_line2 ?? null,
    city: org.city ?? null,
    zip: org.zip ?? null,
    country_code: org.country_code ?? null,
    phone: org.phone ?? null,
    email: org.email ?? null,
    tax_id: org.tax_id ?? null,
  }
}

export function buildCustomerDetailsSnapshot(
  customer: CustomerSnapshotSource,
): CustomerDetailsSnapshot {
  return {
    name: customer.name,
    email: customer.email ?? null,
    billing_email: customer.billing_email ?? null,
    phone: customer.phone ?? null,
    address_line1: customer.address_line1 ?? null,
    address_line2: customer.address_line2 ?? null,
    city: customer.city ?? null,
    zip: customer.zip ?? null,
    country: customer.country ?? null,
  }
}
