import { supabase } from "@/lib/supabase"

export type Customer = {
  id: string
  created_at: string
  org_id: string
  name: string
  email: string | null
  billing_email: string | null
  phone: string | null
  website: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  zip: string | null
  country: string | null
  country_code: string | null
  vat_number: string | null
  note: string | null
  logo_url: string | null
  preferred_currency: string | null
  is_archived: boolean
  industry: string | null
  company_type: string | null
  main_contact: string | null
  // AI enrichment
  description: string | null
  employee_count: number | null
  founded_year: number | null
  estimated_revenue: string | null
  funding_stage: string | null
  total_funding: string | null
  headquarters_location: string | null
  linkedin_url: string | null
  twitter_url: string | null
  instagram_url: string | null
  facebook_url: string | null
  ceo_name: string | null
  finance_contact: string | null
  finance_contact_email: string | null
  primary_language: string | null
  fiscal_year_end: string | null
  enrichment_status: string | null
  enriched_at: string | null
}

export type CustomerInput = {
  name: string
  email?: string
  billing_email?: string
  phone?: string
  website?: string
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  zip?: string
  country?: string
  country_code?: string
  vat_number?: string
  note?: string
  industry?: string
  company_type?: string
  preferred_currency?: string
  main_contact?: string
}

export async function listCustomers(orgId: string): Promise<Customer[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("id, created_at, org_id, name, email, billing_email, phone, website, address_line1, address_line2, city, state, zip, country, country_code, vat_number, note, logo_url, preferred_currency, is_archived, industry, company_type, main_contact, description, employee_count, founded_year, estimated_revenue, funding_stage, total_funding, headquarters_location, linkedin_url, twitter_url, instagram_url, facebook_url, ceo_name, finance_contact, finance_contact_email, primary_language, fiscal_year_end, enrichment_status, enriched_at")
    .eq("org_id", orgId)
    .eq("is_archived", false)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getCustomer(id: string, orgId: string): Promise<Customer> {
  const { data, error } = await supabase
    .from("customers")
    .select("id, created_at, org_id, name, email, billing_email, phone, website, address_line1, address_line2, city, state, zip, country, country_code, vat_number, note, logo_url, preferred_currency, is_archived, industry, company_type, main_contact, description, employee_count, founded_year, estimated_revenue, funding_stage, total_funding, headquarters_location, linkedin_url, twitter_url, instagram_url, facebook_url, ceo_name, finance_contact, finance_contact_email, primary_language, fiscal_year_end, enrichment_status, enriched_at")
    .eq("id", id)
    .eq("org_id", orgId)
    .single()

  if (error) throw error
  return data
}

export async function createCustomer(orgId: string, input: CustomerInput): Promise<Customer> {
  const { data, error } = await supabase
    .from("customers")
    .insert({ org_id: orgId, ...input })
    .select("id, created_at, org_id, name, email, billing_email, phone, website, address_line1, address_line2, city, state, zip, country, country_code, vat_number, note, logo_url, preferred_currency, is_archived, industry, company_type, main_contact, description, employee_count, founded_year, estimated_revenue, funding_stage, total_funding, headquarters_location, linkedin_url, twitter_url, instagram_url, facebook_url, ceo_name, finance_contact, finance_contact_email, primary_language, fiscal_year_end, enrichment_status, enriched_at")
    .single()

  if (error) throw error
  return data
}

export async function updateCustomer(id: string, orgId: string, input: Partial<CustomerInput>): Promise<Customer> {
  const { data, error } = await supabase
    .from("customers")
    .update(input)
    .eq("id", id)
    .eq("org_id", orgId)
    .select("id, created_at, org_id, name, email, billing_email, phone, website, address_line1, address_line2, city, state, zip, country, country_code, vat_number, note, logo_url, preferred_currency, is_archived, industry, company_type, main_contact, description, employee_count, founded_year, estimated_revenue, funding_stage, total_funding, headquarters_location, linkedin_url, twitter_url, instagram_url, facebook_url, ceo_name, finance_contact, finance_contact_email, primary_language, fiscal_year_end, enrichment_status, enriched_at")
    .single()

  if (error) throw error
  return data
}

export async function deleteCustomer(id: string, orgId: string): Promise<void> {
  const { error } = await supabase.from("customers").delete().eq("id", id).eq("org_id", orgId)
  if (error) throw error
}

export async function cancelEnrichment(id: string, orgId: string): Promise<void> {
  const { error } = await supabase
    .from("customers")
    .update({ enrichment_status: null })
    .eq("id", id)
    .eq("org_id", orgId)
  if (error) throw error
}

export async function triggerEnrichment(customerId: string): Promise<void> {
  const { error } = await supabase.functions.invoke("enrich-customer", {
    body: { customerId },
  })
  if (error) throw error
}

export async function clearEnrichment(id: string, orgId: string): Promise<Customer> {
  const { data, error } = await supabase
    .from("customers")
    .update({
      enrichment_status: null,
      enriched_at: null,
      description: null,
      founded_year: null,
      estimated_revenue: null,
      funding_stage: null,
      total_funding: null,
      headquarters_location: null,
      linkedin_url: null,
      twitter_url: null,
      instagram_url: null,
      facebook_url: null,
      ceo_name: null,
      finance_contact: null,
      finance_contact_email: null,
      primary_language: null,
      fiscal_year_end: null,
    })
    .eq("id", id)
    .eq("org_id", orgId)
    .select("id, created_at, org_id, name, email, billing_email, phone, website, address_line1, address_line2, city, state, zip, country, country_code, vat_number, note, logo_url, preferred_currency, is_archived, industry, company_type, main_contact, description, employee_count, founded_year, estimated_revenue, funding_stage, total_funding, headquarters_location, linkedin_url, twitter_url, instagram_url, facebook_url, ceo_name, finance_contact, finance_contact_email, primary_language, fiscal_year_end, enrichment_status, enriched_at")
    .single()

  if (error) throw error
  return data
}
