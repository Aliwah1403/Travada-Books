import { api, unwrap } from "@/lib/api";
import { apiWritesEnabled } from "@/lib/api-flags";
import {
  createBill,
  createBillFromInboxItem,
  deleteBill,
  setBillPaid,
  updateBill,
  type BillInput,
} from "@/lib/queries/bills";
import type { InboxItem } from "@/lib/queries/inbox";

// Bill writes (API-WRITES-PLAN.md domain 6a). Each goes through /v1/bills
// when apiWritesEnabled("bills") is on, and through the original direct
// Supabase write when it's off — callers don't need to know which.

/** A fresh key per user action, so a retried request can't run twice. */
const idem = () => ({ headers: { "Idempotency-Key": crypto.randomUUID() } });
const viaApi = () => apiWritesEnabled("bills");
const bill = () => api.v1.bills[":id"];

export const billWrites = {
  async create(orgId: string, userId: string | null, input: BillInput): Promise<void> {
    if (!viaApi()) return void (await createBill(orgId, userId, input));
    await unwrap(api.v1.bills.$post({ json: input }, idem()));
  },

  async update(id: string, input: BillInput): Promise<void> {
    if (!viaApi()) return updateBill(id, input);
    await unwrap(bill().$patch({ param: { id }, json: input }, idem()));
  },

  async setPaid(id: string, paid: boolean): Promise<void> {
    if (!viaApi()) return setBillPaid(id, paid);
    await unwrap(bill().paid.$post({ param: { id }, json: { paid } }, idem()));
  },

  async remove(id: string): Promise<void> {
    if (!viaApi()) return deleteBill(id);
    await unwrap(bill().$delete({ param: { id } }));
  },

  async fromInbox(item: InboxItem, userId: string | null): Promise<void> {
    if (!viaApi()) return createBillFromInboxItem(item, userId);
    await unwrap(api.v1.bills["from-inbox"].$post({ json: { inbox_item_id: item.id } }, idem()));
  },
};
