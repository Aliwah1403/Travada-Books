import { eq, sql } from "drizzle-orm"
import { inOrg } from "../db/client.js"
import { customers } from "../db/schema.js"
import { mapDbError, pgErrorCode, ServiceError } from "../lib/errors.js"
import type { CustomerFields } from "./customer-schemas.js"
import type { ServiceCtx } from "./invoices.js"

// Every customer write, in one place (API-WRITES-PLAN.md §6, domain 4). The
// /v1/customers routes (the app) and the assistant's tools both call these.
// Starting AI enrichment stays in the enrich-customer edge function (it's an
// AI job with its own rate limit); clearing or cancelling it is a plain write
// and lives here.

export async function getCustomerRow(ctx: Pick<ServiceCtx, "db" | "orgId">, id: string) {
  const [row] = await ctx.db.select().from(customers).where(inOrg(customers, ctx.orgId, eq(customers.id, id))).limit(1)
  if (!row) throw new ServiceError(404, "NOT_FOUND", "Customer not found.")
  return row
}

export type CustomerRow = Awaited<ReturnType<typeof getCustomerRow>>

/** snake_case form fields → table columns; "" becomes null so a cleared field is really cleared. */
function columns(input: CustomerFields) {
  const map = {
    name: "name",
    email: "email",
    billing_email: "billingEmail",
    billing_cc: "billingCc",
    phone: "phone",
    website: "website",
    address_line1: "addressLine1",
    address_line2: "addressLine2",
    city: "city",
    state: "state",
    zip: "zip",
    country: "country",
    country_code: "countryCode",
    vat_number: "vatNumber",
    note: "note",
    industry: "industry",
    company_type: "companyType",
    preferred_currency: "preferredCurrency",
    main_contact: "mainContact",
  } as const satisfies Record<keyof CustomerFields, keyof typeof customers.$inferInsert>
  const out: Partial<typeof customers.$inferInsert> = {}
  for (const [key, column] of Object.entries(map) as [keyof CustomerFields, (typeof map)[keyof CustomerFields]][]) {
    const value = input[key]
    if (value === undefined) continue
    ;(out as Record<string, unknown>)[column] = value === "" ? null : value
  }
  return out
}

export async function createCustomer(ctx: ServiceCtx, input: CustomerFields & { name: string }) {
  try {
    const [row] = await ctx.db
      .insert(customers)
      .values({ ...columns(input), name: input.name, orgId: ctx.orgId })
      .returning()
    return { customer: row! }
  } catch (error) {
    throw mapDbError(error)
  }
}

export async function updateCustomer(ctx: ServiceCtx, id: string, input: CustomerFields) {
  const values = columns(input)
  if (Object.keys(values).length === 0) return { customer: await getCustomerRow(ctx, id) }
  let row: CustomerRow | undefined
  try {
    ;[row] = await ctx.db.update(customers).set(values).where(inOrg(customers, ctx.orgId, eq(customers.id, id))).returning()
  } catch (error) {
    throw mapDbError(error)
  }
  if (!row) throw new ServiceError(404, "NOT_FOUND", "Customer not found.")
  return { customer: row }
}

/** Archived customers drop out of the customer list but keep their history. */
export async function archiveCustomer(ctx: ServiceCtx, id: string, archived: boolean) {
  const [row] = await ctx.db
    .update(customers)
    .set({ isArchived: archived })
    .where(inOrg(customers, ctx.orgId, eq(customers.id, id)))
    .returning()
  if (!row) throw new ServiceError(404, "NOT_FOUND", "Customer not found.")
  return { customer: row }
}

/**
 * Delete a customer. Their statements and recurring series go with them;
 * invoices and transactions keep their snapshot and lose the link. Quotes
 * block it (no cascade), so that case gets a clear answer instead of a 500.
 */
export async function deleteCustomer(ctx: ServiceCtx, id: string) {
  const customer = await getCustomerRow(ctx, id)
  try {
    // Its own (sub)transaction, so a refused delete doesn't poison a caller's transaction.
    await ctx.db.transaction((tx) => tx.delete(customers).where(inOrg(customers, ctx.orgId, eq(customers.id, id))))
  } catch (error) {
    if (pgErrorCode(error) === "23503") {
      throw new ServiceError(
        409,
        "CONFLICT",
        `${customer.name} still has quotes, so they can't be deleted. Delete those quotes first, or archive the customer instead.`,
      )
    }
    throw mapDbError(error)
  }
  return { customer }
}

/** Turn the customer portal on or off. Re-enabling keeps the same link (set_customer_portal). */
export async function setCustomerPortal(ctx: ServiceCtx, id: string, enabled: boolean) {
  const [row] = await ctx.db
    .update(customers)
    .set({
      portalEnabled: enabled,
      ...(enabled ? { portalId: sql`coalesce(${customers.portalId}, public.generate_portal_id())` } : {}),
    })
    .where(inOrg(customers, ctx.orgId, eq(customers.id, id)))
    .returning()
  if (!row) throw new ServiceError(404, "NOT_FOUND", "Customer not found.")
  return { customer: row }
}

/** A new portal link; the old one stops working at once. */
export async function regenerateCustomerPortal(ctx: ServiceCtx, id: string) {
  const [row] = await ctx.db
    .update(customers)
    .set({ portalId: sql`public.generate_portal_id()` })
    .where(inOrg(customers, ctx.orgId, eq(customers.id, id)))
    .returning()
  if (!row) throw new ServiceError(404, "NOT_FOUND", "Customer not found.")
  return { customer: row }
}

/** Stop a running enrichment (clears the pending state only). */
export async function cancelEnrichment(ctx: ServiceCtx, id: string) {
  const [row] = await ctx.db
    .update(customers)
    .set({ enrichmentStatus: null })
    .where(inOrg(customers, ctx.orgId, eq(customers.id, id)))
    .returning()
  if (!row) throw new ServiceError(404, "NOT_FOUND", "Customer not found.")
  return { customer: row }
}

/** Remove everything enrichment filled in. */
export async function clearEnrichment(ctx: ServiceCtx, id: string) {
  const [row] = await ctx.db
    .update(customers)
    .set({
      enrichmentStatus: null,
      enrichedAt: null,
      description: null,
      foundedYear: null,
      estimatedRevenue: null,
      fundingStage: null,
      totalFunding: null,
      headquartersLocation: null,
      linkedinUrl: null,
      twitterUrl: null,
      instagramUrl: null,
      facebookUrl: null,
      ceoName: null,
      financeContact: null,
      financeContactEmail: null,
      primaryLanguage: null,
      fiscalYearEnd: null,
    })
    .where(inOrg(customers, ctx.orgId, eq(customers.id, id)))
    .returning()
  if (!row) throw new ServiceError(404, "NOT_FOUND", "Customer not found.")
  return { customer: row }
}

export function customerServices(ctx: ServiceCtx) {
  return {
    get: (id: string) => getCustomerRow(ctx, id),
    create: (input: CustomerFields & { name: string }) => createCustomer(ctx, input),
    update: (id: string, input: CustomerFields) => updateCustomer(ctx, id, input),
    archive: (id: string, archived: boolean) => archiveCustomer(ctx, id, archived),
    remove: (id: string) => deleteCustomer(ctx, id),
    setPortal: (id: string, enabled: boolean) => setCustomerPortal(ctx, id, enabled),
  }
}

export type CustomerServices = ReturnType<typeof customerServices>
