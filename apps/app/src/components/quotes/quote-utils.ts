// Re-exported for backwards compatibility — the actual totals math is
// shared with invoices in lib/document-totals.ts.
export {
  type LineItem,
  computeDocumentTotals as computeQuoteTotals,
} from "@/lib/document-totals";
