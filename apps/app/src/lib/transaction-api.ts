import { api, unwrap } from "@/lib/api";
import { apiWritesEnabled } from "@/lib/api-flags";
import { createCategoryRule, deleteCategoryRule } from "@/lib/queries/category-rules";
import {
  addAttachments,
  bulkDeleteTransactions,
  bulkUpdateTransactions,
  createTransaction,
  createTransactionCategory,
  deleteAttachment,
  deleteTransaction,
  deleteTransactionCategory,
  updateTransaction,
  updateTransactionCategory,
  type AttachmentInput,
  type BulkTransactionUpdate,
  type TransactionInput,
} from "@/lib/queries/transactions";

// Transaction, category and category-rule writes (API-WRITES-PLAN.md
// domain 5). Each goes through /v1 when apiWritesEnabled("transactions") is
// on, and through the original direct Supabase write when it's off — the
// pages call these and don't need to know which. Uploading attachment files
// to storage and their AI processing stay in the app either way; on the API
// path the API queues a new transaction's enrichment itself.

/** A fresh key per user action, so a retried request can't run twice. */
const idem = () => ({ headers: { "Idempotency-Key": crypto.randomUUID() } });
const viaApi = () => apiWritesEnabled("transactions");
const tx = () => api.v1.transactions[":id"];

export const transactionWrites = {
  async create(orgId: string, userId: string, input: TransactionInput, baseCurrency: string): Promise<string> {
    if (!viaApi()) return createTransaction(orgId, userId, input, baseCurrency);
    const { markInvoicePaid, attachments, ...fields } = input;
    const res = await unwrap(
      api.v1.transactions.$post(
        { json: { ...fields, mark_invoice_paid: !!markInvoicePaid, attachments: attachments ?? [] } },
        idem(),
      ),
    );
    return res.transaction.id;
  },

  async update(
    id: string,
    orgId: string,
    input: Partial<Omit<TransactionInput, "id" | "markInvoicePaid" | "attachments">>,
    baseCurrency?: string,
  ): Promise<void> {
    if (!viaApi()) return updateTransaction(id, orgId, input, baseCurrency);
    await unwrap(tx().$patch({ param: { id }, json: input }, idem()));
  },

  async remove(id: string, orgId: string): Promise<void> {
    if (!viaApi()) return deleteTransaction(id, orgId);
    await unwrap(tx().$delete({ param: { id } }));
  },

  async bulkRemove(ids: string[], orgId: string): Promise<void> {
    if (!viaApi()) return bulkDeleteTransactions(ids, orgId);
    await unwrap(api.v1.transactions["bulk-delete"].$post({ json: { ids } }, idem()));
  },

  async bulkUpdate(ids: string[], orgId: string, update: BulkTransactionUpdate): Promise<void> {
    if (!viaApi()) return bulkUpdateTransactions(ids, orgId, update);
    await unwrap(api.v1.transactions["bulk-update"].$post({ json: { ids, update } }, idem()));
  },

  async addAttachments(transactionId: string, orgId: string, attachments: AttachmentInput[]): Promise<void> {
    if (!viaApi()) return addAttachments(transactionId, orgId, attachments);
    await unwrap(tx().attachments.$post({ param: { id: transactionId }, json: { attachments } }, idem()));
  },

  async deleteAttachment(id: string, filePath: string): Promise<void> {
    if (!viaApi()) return deleteAttachment(id, filePath);
    await unwrap(api.v1.transactions.attachments[":id"].$delete({ param: { id } }));
  },

  async createCategory(orgId: string, input: { name: string; color?: string }): Promise<{ id: string }> {
    if (!viaApi()) return createTransactionCategory(orgId, input);
    return (await unwrap(api.v1["transaction-categories"].$post({ json: input }, idem()))).category;
  },

  async updateCategory(id: string, orgId: string, input: { name?: string; color?: string }): Promise<void> {
    if (!viaApi()) return void (await updateTransactionCategory(id, orgId, input));
    await unwrap(api.v1["transaction-categories"][":id"].$patch({ param: { id }, json: input }, idem()));
  },

  async deleteCategory(id: string, orgId: string): Promise<void> {
    if (!viaApi()) return deleteTransactionCategory(id, orgId);
    await unwrap(api.v1["transaction-categories"][":id"].$delete({ param: { id } }));
  },

  async createRule(input: { orgId: string; pattern: string; categoryId: string; userId: string }): Promise<{ appliedCount: number }> {
    if (!viaApi()) return createCategoryRule(input);
    const res = await unwrap(
      api.v1["category-rules"].$post({ json: { pattern: input.pattern, category_id: input.categoryId } }, idem()),
    );
    return { appliedCount: res.applied };
  },

  async deleteRule(id: string): Promise<void> {
    if (!viaApi()) return deleteCategoryRule(id);
    await unwrap(api.v1["category-rules"][":id"].$delete({ param: { id } }));
  },
};
