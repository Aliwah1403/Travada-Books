import { task, logger } from "@trigger.dev/sdk";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { ToolLoopAgent, generateObject, stepCountIs, tool, zodSchema } from "ai";
import Exa from "exa-js";
import { z } from "zod";
import { supabase } from "../lib/supabase";

const google = createGoogleGenerativeAI();
const exa = new Exa(process.env.EXA_API_KEY!);

// ─── Schema ───────────────────────────────────────────────────────────────────

const industryOptions = [
  "Software", "Healthcare", "Finance", "E-commerce", "Manufacturing",
  "Education", "Real Estate", "Media", "Consulting", "Legal",
  "Marketing", "Logistics", "Energy", "Hospitality", "Retail", "Other",
] as const;

const companyTypeOptions = [
  "B2B", "B2C", "B2B2C", "SaaS", "Agency", "Consultancy",
  "E-commerce", "Marketplace", "Enterprise", "SMB", "Startup", "Other",
] as const;

const employeeCountOptions = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"] as const;
const revenueOptions = ["<1M", "1M-10M", "10M-50M", "50M-100M", "100M+"] as const;
const fundingStageOptions = ["Bootstrapped", "Pre-seed", "Seed", "Series A", "Series B", "Series C+", "Public", "Acquired"] as const;

const enrichmentSchema = z.object({
  description: z.string().nullable().describe("1-2 sentence description of what the company does."),
  industry: z.enum(industryOptions).nullable().describe("Primary industry."),
  companyType: z.enum(companyTypeOptions).nullable().describe("Business model — B2B, SaaS, Agency, etc."),
  employeeCount: z.enum(employeeCountOptions).nullable().describe("Employee count range from LinkedIn or website."),
  foundedYear: z.number().int().min(1800).max(2030).nullable().describe("Year the company was founded."),
  estimatedRevenue: z.enum(revenueOptions).nullable().describe("Estimated revenue if publicly available."),
  fundingStage: z.enum(fundingStageOptions).nullable().describe("Funding stage if known."),
  totalFunding: z.string().nullable().describe("Total funding raised (e.g. '$10M')."),
  headquartersLocation: z.string().nullable().describe("City and country of HQ (e.g. 'Nairobi, Kenya')."),
  addressLine1: z.string().nullable().describe("Street address of company HQ."),
  city: z.string().nullable(),
  state: z.string().nullable(),
  zipCode: z.string().nullable(),
  country: z.string().nullable().describe("Full country name."),
  linkedinUrl: z.string().nullable().describe("LinkedIn company page URL with https:// prefix."),
  twitterUrl: z.string().nullable().describe("Twitter/X company URL with https:// prefix."),
  instagramUrl: z.string().nullable().describe("Instagram URL with https:// prefix."),
  facebookUrl: z.string().nullable().describe("Facebook company page URL with https:// prefix."),
  ceoName: z.string().nullable().describe("CEO, founder, or primary executive name."),
  financeContact: z.string().nullable().describe("Finance or accounts payable contact name."),
  financeContactEmail: z.string().nullable().describe("Finance department email (finance@, ap@, invoices@)."),
  primaryLanguage: z.string().nullable().describe("Primary business language (e.g. 'English', 'Swahili')."),
  fiscalYearEnd: z.string().nullable().describe("Fiscal year end month (e.g. 'December')."),
  vatNumber: z.string().nullable().describe("VAT/Tax ID/KRA PIN (e.g. 'P051234567X')."),
});

type EnrichmentData = z.infer<typeof enrichmentSchema>;

// ─── Verification ─────────────────────────────────────────────────────────────

function verifyLinkedInUrl(url: string | null): string | null {
  if (!url) return null;
  let u = url.trim();
  if (!u.startsWith("http")) u = `https://${u}`;
  if (!/^https?:\/\/(www\.)?linkedin\.com\/company\/[\w-]+\/?$/i.test(u)) return null;
  u = u.replace(/\/$/, "");
  if (!u.includes("www.")) u = u.replace("linkedin.com", "www.linkedin.com");
  return u;
}

function verifyTwitterUrl(url: string | null): string | null {
  if (!url) return null;
  let u = url.trim();
  if (!u.startsWith("http")) u = `https://${u}`;
  if (!/^https?:\/\/(www\.)?(twitter\.com|x\.com)\/[\w]+\/?$/i.test(u)) return null;
  u = u.replace(/\/$/, "").replace("www.twitter.com", "x.com").replace("twitter.com", "x.com").replace("www.x.com", "x.com");
  return u;
}

function verifyInstagramUrl(url: string | null): string | null {
  if (!url) return null;
  let u = url.trim();
  if (!u.startsWith("http")) u = `https://${u}`;
  if (!/^https?:\/\/(www\.)?instagram\.com\/[\w.]+\/?$/i.test(u)) return null;
  u = u.replace(/\/$/, "");
  if (!u.includes("www.")) u = u.replace("instagram.com", "www.instagram.com");
  return u;
}

function verifyFacebookUrl(url: string | null): string | null {
  if (!url) return null;
  let u = url.trim();
  if (!u.startsWith("http")) u = `https://${u}`;
  if (!/^https?:\/\/(www\.)?facebook\.com\/[\w.]+\/?$/i.test(u)) return null;
  u = u.replace(/\/$/, "");
  if (!u.includes("www.")) u = u.replace("facebook.com", "www.facebook.com");
  return u;
}

function validateFoundedYear(year: number | null): number | null {
  if (!year) return null;
  const current = new Date().getFullYear();
  return year >= 1800 && year <= current ? year : null;
}

function validateTotalFunding(funding: string | null, stage: string | null): string | null {
  if (stage === "Bootstrapped") return null;
  if (!funding) return null;
  const trimmed = funding.trim();
  const match = trimmed.match(/^([^0-9]*)(\d+(?:\.\d+)?)\s*(K|M|B|k|m|b)?$/i);
  if (!match) return trimmed;
  const [, prefix, numStr, suffix] = match;
  if (!numStr) return trimmed;
  const rounded = Math.round(parseFloat(numStr));
  return `${prefix || "$"}${rounded}${(suffix || "").toUpperCase()}`;
}

// ─── Domain helper ────────────────────────────────────────────────────────────

const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com",
  "yahoo.com", "yahoo.co.uk", "yahoo.com.au", "yahoo.co.in", "yahoo.fr", "yahoo.de", "yahoo.es",
  "hotmail.com", "hotmail.co.uk", "hotmail.fr", "hotmail.de", "hotmail.es",
  "outlook.com", "outlook.co.uk",
  "live.com", "live.co.uk",
  "icloud.com", "me.com", "mac.com",
  "aol.com",
  "protonmail.com", "proton.me",
  "zoho.com",
  "yandex.com", "yandex.ru",
  "mail.com", "email.com",
  "gmx.com", "gmx.net", "gmx.de",
  "web.de", "t-online.de",
  "msn.com",
]);

function hasValue(v: unknown): boolean {
  return typeof v === "string" ? v.trim().length > 0 : v != null;
}

function extractDomain(source: string): string | null {
  let s = source.trim();
  if (s.startsWith("https://")) s = s.slice(8);
  else if (s.startsWith("http://")) s = s.slice(7);
  if (s.startsWith("www.")) s = s.slice(4);
  const slash = s.indexOf("/");
  if (slash !== -1) s = s.slice(0, slash);
  return s || null;
}

// ─── Agent (built once at module level, same as Midday) ───────────────────────

const agent = new ToolLoopAgent({
  model: google("gemini-3-flash-preview"),
  instructions: `You are a fast company research agent. Find key company information in ONE search.

## CRITICAL: Do exactly 1 search, then IMMEDIATELY summarize.

## Your single search
Use 1-2 queries:
1. "[Company] LinkedIn company"
2. "[Company] business registry" OR country-specific registry

## THEN STOP and write your summary. Do NOT search again.

## What to extract:
- LinkedIn company URL
- Tax ID / VAT / KRA PIN
- Employee count, founded year
- CEO name, headquarters address
- Description of what they do
- Social media links

Include source URLs in your summary.`,
  tools: {
    search: tool({
      description: "Search the web with 1-2 queries.",
      inputSchema: zodSchema(z.object({
        queries: z.array(z.string()).max(2),
      })),
      execute: async ({ queries }: { queries: string[] }) => {
        logger.log("Enrichment search", { queries });
        const results = await Promise.all(
          queries.map((q: string) =>
            exa.search(q, {
              type: "auto",
              numResults: 4,
              contents: { text: { maxCharacters: 1500 } },
            })
          )
        );
        const all = results.flatMap((r) => r.results ?? []);
        return (
          all
            .map((r) => `**${r.title ?? "Untitled"}**\nURL: ${r.url}\n${(r.text ?? "").slice(0, 600)}`)
            .join("\n\n---\n\n") || "No results found."
        );
      },
    }),
  },
  stopWhen: stepCountIs(3),
});

// ─── Task ─────────────────────────────────────────────────────────────────────

export const enrichCustomerTask = task({
  id: "enrich-customer",
  retry: { maxAttempts: 2 },
  run: async (payload: { customerId: string; orgId: string }) => {
    const { customerId, orgId } = payload;

    // 1. Fetch customer
    // NB: this must stay a single string literal (not built via `+`
    // concatenation) — supabase-js parses the select() argument at the type
    // level to infer `customer`'s shape, and concatenation widens it to
    // plain `string`, which breaks that inference (GenericStringError).
    const { data: customer, error: fetchError } = await supabase
      .from("customers")
      .select(
        "id, name, email, website, country, country_code, city, state, zip, address_line1, vat_number, logo_url, industry, description, company_type, founded_year, estimated_revenue, funding_stage, total_funding, headquarters_location, linkedin_url, twitter_url, instagram_url, facebook_url, ceo_name, finance_contact, finance_contact_email, primary_language, fiscal_year_end"
      )
      .eq("id", customerId)
      .eq("org_id", orgId)
      .single();

    if (fetchError || !customer) {
      logger.error("Customer not found", { customerId, orgId });
      return;
    }

    if (!customer.name) {
      logger.log("No name, skipping enrichment", { customerId });
      return;
    }

    // 2. Mark as processing
    await supabase
      .from("customers")
      .update({ enrichment_status: "processing" })
      .eq("id", customerId);

    try {
      // Derive domain from website or email
      const websiteDomain = customer.website ? extractDomain(customer.website) : null;
      const emailDomain = customer.email ? (customer.email.split("@")[1] ?? null) : null;

      // Skip enrichment when the only signal is a personal email (no company website)
      if (!websiteDomain && emailDomain && PERSONAL_EMAIL_DOMAINS.has(emailDomain.toLowerCase())) {
        logger.log("Personal email domain, skipping enrichment", { customerId, emailDomain });
        await supabase
          .from("customers")
          .update({ enrichment_status: "done", enriched_at: new Date().toISOString() })
          .eq("id", customerId);
        return;
      }

      const domain = websiteDomain ?? emailDomain;

      // 3. Phase 1: Agentic research
      logger.log("Starting research phase", { name: customer.name, domain });

      const prompt = buildPrompt(customer.name, domain, {
        countryCode: customer.country_code,
        city: customer.city,
        vatNumber: customer.vat_number,
      });

      const { text: researchText } = await agent.generate({ prompt });

      logger.log("Research complete", { textLength: researchText.length });

      // 4. Phase 2: Structured extraction
      const { object: extracted } = await generateObject({
        model: google("gemini-2.5-flash"),
        schema: enrichmentSchema,
        prompt: buildExtractionPrompt(customer.name, customer.website ?? domain ?? "", researchText),
      });

      // 5. Phase 3: Verify
      const fundingStage = extracted.fundingStage ?? null;
      const verified = {
        description: extracted.description?.trim() || null,
        industry: extracted.industry ?? null,
        company_type: extracted.companyType ?? null,
        founded_year: validateFoundedYear(extracted.foundedYear),
        estimated_revenue: extracted.estimatedRevenue ?? null,
        funding_stage: fundingStage,
        total_funding: validateTotalFunding(extracted.totalFunding ?? null, fundingStage),
        headquarters_location: extracted.headquartersLocation?.trim() || null,
        address_line1: extracted.addressLine1?.trim() || null,
        city: extracted.city?.trim() || null,
        state: extracted.state?.trim() || null,
        zip: extracted.zipCode?.trim() || null,
        country: extracted.country?.trim() || null,
        linkedin_url: verifyLinkedInUrl(extracted.linkedinUrl ?? null),
        twitter_url: verifyTwitterUrl(extracted.twitterUrl ?? null),
        instagram_url: verifyInstagramUrl(extracted.instagramUrl ?? null),
        facebook_url: verifyFacebookUrl(extracted.facebookUrl ?? null),
        ceo_name: extracted.ceoName?.trim() || null,
        finance_contact: extracted.financeContact?.trim() || null,
        finance_contact_email: extracted.financeContactEmail?.trim()?.toLowerCase() || null,
        primary_language: extracted.primaryLanguage?.trim() || null,
        fiscal_year_end: extracted.fiscalYearEnd?.trim() || null,
        vat_number: extracted.vatNumber?.trim()?.toUpperCase() || null,
      };

      // 6. Never overwrite a value the user already typed, and never write
      // null over an existing value. Non-address fields are considered
      // independently; the address fields are treated as one group so we
      // never mix a stored address with a freshly-discovered one.
      const updatePayload: Record<string, unknown> = {};

      const nonAddressFields: Array<{ key: keyof typeof verified; existing: unknown }> = [
        { key: "description", existing: customer.description },
        { key: "industry", existing: customer.industry },
        { key: "company_type", existing: customer.company_type },
        { key: "founded_year", existing: customer.founded_year },
        { key: "estimated_revenue", existing: customer.estimated_revenue },
        { key: "funding_stage", existing: customer.funding_stage },
        { key: "total_funding", existing: customer.total_funding },
        { key: "headquarters_location", existing: customer.headquarters_location },
        { key: "linkedin_url", existing: customer.linkedin_url },
        { key: "twitter_url", existing: customer.twitter_url },
        { key: "instagram_url", existing: customer.instagram_url },
        { key: "facebook_url", existing: customer.facebook_url },
        { key: "ceo_name", existing: customer.ceo_name },
        { key: "finance_contact", existing: customer.finance_contact },
        { key: "finance_contact_email", existing: customer.finance_contact_email },
        { key: "primary_language", existing: customer.primary_language },
        { key: "fiscal_year_end", existing: customer.fiscal_year_end },
        { key: "vat_number", existing: customer.vat_number },
      ];

      for (const { key, existing } of nonAddressFields) {
        const value = verified[key];
        if (value != null && !hasValue(existing)) {
          updatePayload[key] = value;
        }
      }

      const addressFields = ["address_line1", "city", "state", "zip", "country"] as const;
      const hasExistingAddress = addressFields.some((f) => hasValue(customer[f]));
      if (!hasExistingAddress) {
        for (const f of addressFields) {
          const value = verified[f];
          if (value != null) updatePayload[f] = value;
        }
      }

      // 7. Derive logo via logo.dev — only when the customer has none yet
      const logoToken = process.env.LOGO_DEV_TOKEN;
      const logo_url = domain && logoToken
        ? `https://img.logo.dev/${domain}?token=${logoToken}&size=128&retina=true`
        : null;
      if (logo_url && !hasValue(customer.logo_url)) {
        updatePayload.logo_url = logo_url;
      }

      // 8. Backfill website from discovered domain if not set
      if (!customer.website && domain) {
        updatePayload.website = `https://${domain}`;
      }

      updatePayload.enrichment_status = "done";
      updatePayload.enriched_at = new Date().toISOString();

      await supabase
        .from("customers")
        .update(updatePayload)
        .eq("id", customerId);

      logger.log("Enrichment saved", { customerId });
    } catch (err) {
      logger.error("Enrichment failed", { customerId, error: String(err) });
      await supabase
        .from("customers")
        .update({ enrichment_status: "failed" })
        .eq("id", customerId);
      throw err;
    }
  },
});

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildPrompt(
  name: string,
  domain: string | null,
  hints: { countryCode?: string | null; city?: string | null; vatNumber?: string | null }
): string {
  const extras: string[] = [];
  if (hints.countryCode) extras.push(`Country: ${hints.countryCode}`);
  if (hints.city) extras.push(`City: ${hints.city}`);
  if (hints.vatNumber) extras.push(`Known Tax ID: ${hints.vatNumber}`);
  return `Research this company and find comprehensive information:

**Company:** ${name}
${domain ? `**Website:** ${domain}` : ""}
${extras.join("\n")}

Find:
- LinkedIn company page URL
- VAT/Tax ID/KRA PIN (search business registry for their country)
- Employee count, founded year
- CEO/Founder name
- Full headquarters address
- Description of what the company does
- Social media (Twitter, Instagram, Facebook)

Search for their LinkedIn profile and business registry information.`;
}

function buildExtractionPrompt(name: string, website: string, research: string): string {
  return `Extract structured company data from this research.

**Company:** ${name}
**Website:** ${website}

## Research Findings:
${research}

## Extraction Rules:
- Only extract data clearly about ${name}
- Return null for any field not found
- vatNumber: include country prefix if known (e.g. P051234567X for Kenya, SE5567037485 for Sweden)
- linkedinUrl: full URL with https:// (e.g. https://linkedin.com/company/example)
- employeeCount: map to ranges "1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"
- headquartersLocation: "City, Country" format

Extract the data now:`;
}
