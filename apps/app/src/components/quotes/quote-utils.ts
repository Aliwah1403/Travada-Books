// Re-exported for backwards compatibility — the actual totals math is
// shared with invoices in lib/document-totals.ts.
export {
  type LineItem,
  computeDocumentTotals as computeQuoteTotals,
} from "@/lib/document-totals";

// Single source of truth for when a quote can be edited — used by the list
// menu, the detail page and the edit route guard. Drafts are still being
// written; declined quotes can be revised and resent (saving resets them to
// draft). Sent quotes are locked while the customer decides, and accepted /
// expired quotes are final.
export function isQuoteEditable(status: string): boolean {
  return status === "draft" || status === "declined"
}
