// Quote helpers now live in @travada-books/core (shared with the API);
// re-exported here under the names the quote pages already use.
export {
  type LineItem,
  computeDocumentTotals as computeQuoteTotals,
  isQuoteEditable,
} from "@travada-books/core";
