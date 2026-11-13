import { api, unwrap } from "@/lib/api";
import { apiWritesEnabled } from "@/lib/api-flags";
import {
  addBlocklistEntry,
  bulkDeleteInboxItems,
  confirmSuggestion,
  declineSuggestion,
  deleteInboxItem,
  matchTransaction,
  removeBlocklistEntry,
  retryMatching,
  unmatchTransaction,
  updateInboxStatus,
  type BlocklistEntry,
  type InboxItemStatus,
} from "@/lib/queries/inbox";

// Inbox writes (API-WRITES-PLAN.md domain 6b). Same signatures as the direct
// functions in queries/inbox.ts; each goes through /v1/inbox when
// apiWritesEnabled("inbox") is on and the direct Supabase write when it's
// off. On the API path the API sends the "match confirmed" notification and
// queues re-processing itself. Uploading into the inbox stays direct.

/** A fresh key per user action, so a retried request can't run twice. */
const idem = () => ({ headers: { "Idempotency-Key": crypto.randomUUID() } });
const viaApi = () => apiWritesEnabled("inbox");
const item = () => api.v1.inbox[":id"];

export const inboxWrites = {
  async remove(id: string, filePath: string): Promise<void> {
    if (!viaApi()) return deleteInboxItem(id, filePath);
    await unwrap(api.v1.inbox.delete.$post({ json: { ids: [id] } }, idem()));
  },

  async bulkRemove(items: { id: string; file_path: string }[]): Promise<void> {
    if (!viaApi()) return bulkDeleteInboxItems(items);
    await unwrap(api.v1.inbox.delete.$post({ json: { ids: items.map((i) => i.id) } }, idem()));
  },

  async setStatus(id: string, status: InboxItemStatus): Promise<void> {
    if (!viaApi()) return updateInboxStatus(id, status);
    await unwrap(item().status.$post({ param: { id }, json: { status } }, idem()));
  },

  async confirmSuggestion(...args: Parameters<typeof confirmSuggestion>): Promise<void> {
    if (!viaApi()) return confirmSuggestion(...args);
    const [suggestionId] = args;
    await unwrap(api.v1.inbox.suggestions[":id"].confirm.$post({ param: { id: suggestionId } }, idem()));
  },

  async declineSuggestion(suggestionId: string, inboxItemId: string, userId: string): Promise<void> {
    if (!viaApi()) return declineSuggestion(suggestionId, inboxItemId, userId);
    await unwrap(api.v1.inbox.suggestions[":id"].decline.$post({ param: { id: suggestionId } }, idem()));
  },

  async match(inboxItemId: string, transactionId: string, orgId: string, userId: string): Promise<void> {
    if (!viaApi()) return matchTransaction(inboxItemId, transactionId, orgId, userId);
    await unwrap(item().match.$post({ param: { id: inboxItemId }, json: { transaction_id: transactionId } }, idem()));
  },

  async unmatch(inboxItemId: string): Promise<void> {
    if (!viaApi()) return unmatchTransaction(inboxItemId);
    await unwrap(item().unmatch.$post({ param: { id: inboxItemId } }, idem()));
  },

  async retry(inboxItemId: string): Promise<void> {
    if (!viaApi()) return retryMatching(inboxItemId);
    await unwrap(item().retry.$post({ param: { id: inboxItemId } }, idem()));
  },

  async addBlocklistEntry(orgId: string, type: "email" | "domain", value: string): Promise<BlocklistEntry> {
    if (!viaApi()) return addBlocklistEntry(orgId, type, value);
    const { entry } = await unwrap(api.v1.inbox.blocklist.$post({ json: { type, value } }, idem()));
    return { ...entry, org_id: orgId } as BlocklistEntry;
  },

  async removeBlocklistEntry(id: string): Promise<void> {
    if (!viaApi()) return removeBlocklistEntry(id);
    await unwrap(api.v1.inbox.blocklist[":id"].$delete({ param: { id } }));
  },
};
