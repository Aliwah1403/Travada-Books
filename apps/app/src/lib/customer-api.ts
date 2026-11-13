import { api, ApiError, unwrap } from "@/lib/api";
import { apiWritesEnabled } from "@/lib/api-flags";
import { regenerateCustomerPortalId, setCustomerPortal } from "@/lib/queries/customer-portal";
import {
  cancelEnrichment,
  clearEnrichment,
  createCustomer,
  deleteCustomer,
  updateCustomer,
  type CustomerInput,
} from "@/lib/queries/customers";

// Customer writes (API-WRITES-PLAN.md domain 4). Each one goes through
// /v1/customers when apiWritesEnabled("customers") is on, and through the
// original direct Supabase write when it's off — so the pages call these and
// don't need to know which. Starting AI enrichment stays in the
// enrich-customer edge function either way.

/** A fresh key per user action, so a retried request can't run twice. */
const idem = () => ({ headers: { "Idempotency-Key": crypto.randomUUID() } });
const viaApi = () => apiWritesEnabled("customers");
const customer = () => api.v1.customers[":id"];

export const customerWrites = {
  async create(orgId: string, input: CustomerInput): Promise<{ id: string }> {
    if (!viaApi()) return createCustomer(orgId, input);
    return (await unwrap(api.v1.customers.$post({ json: input }, idem()))).customer;
  },

  async update(id: string, orgId: string, input: Partial<CustomerInput>): Promise<void> {
    if (!viaApi()) return void (await updateCustomer(id, orgId, input));
    await unwrap(customer().$patch({ param: { id }, json: input }, idem()));
  },

  async remove(id: string, orgId: string): Promise<void> {
    if (!viaApi()) return deleteCustomer(id, orgId);
    await unwrap(customer().$delete({ param: { id } }));
  },

  async cancelEnrichment(id: string, orgId: string): Promise<void> {
    if (!viaApi()) return cancelEnrichment(id, orgId);
    await unwrap(customer().enrichment.cancel.$post({ param: { id } }));
  },

  async clearEnrichment(id: string, orgId: string): Promise<void> {
    if (!viaApi()) return void (await clearEnrichment(id, orgId));
    await unwrap(customer().enrichment.$delete({ param: { id } }));
  },

  async setPortal(id: string, enabled: boolean) {
    if (!viaApi()) return setCustomerPortal(id, enabled);
    return unwrap(customer().portal.$post({ param: { id }, json: { enabled } }, idem()));
  },

  async regeneratePortal(id: string): Promise<string> {
    if (!viaApi()) return regenerateCustomerPortalId(id);
    return (await unwrap(customer().portal.regenerate.$post({ param: { id } }, idem()))).portal_id;
  },
};

/** The API's own explanation (e.g. "still has quotes"), else a generic retry hint. */
export function customerErrorDescription(err: unknown): string {
  return err instanceof ApiError && err.status > 0 && err.status < 500 ? err.message : "Please try again.";
}
