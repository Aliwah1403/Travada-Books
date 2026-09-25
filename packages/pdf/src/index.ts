// Browser-safe entry point: templates, theme, types and mappers. No Node
// APIs here — see ./server.ts for the Node-only renderInvoicePdf/etc. and
// logo-fetching helpers used by the worker.

export { theme, type PdfxTheme } from "./theme";
export {
  PdfxThemeContext,
  PdfxThemeProvider,
  usePdfxTheme,
  useSafeMemo,
  type PdfxThemeProviderProps,
} from "./theme-context";

export { normalizeCustomFields } from "./custom-fields";

export type {
  ClassicDocumentData,
  CustomField,
  LedgerEntry,
  LineItem,
  Participant,
  StatementPdfData,
} from "./types";

export { InvoicePdf, InvoiceSharedPdf } from "./templates/invoice-pdf";
export { StatementPdf } from "./templates/statement-pdf";

export {
  buildInvoiceDocumentData,
  type BuildInvoiceDocumentDataOpts,
  type InvoiceDocumentDataRow,
} from "./mappers/invoice";
export {
  buildQuoteDocumentData,
  type BuildQuoteDocumentDataOpts,
  type QuoteDocumentDataRow,
} from "./mappers/quote";
export {
  buildStatementDocumentData,
  type BuildStatementDocumentDataOpts,
} from "./mappers/statement";

export {
  buildStatementLedger,
  formatServerDate,
  resolveDateFnsPattern,
  type BuildStatementLedgerOpts,
  type StatementLedgerInvoice,
} from "./ledger";

// pdfx primitives — re-exported in case app code wants to compose custom
// documents with them directly (mirrors the previous @/components/pdfx/*
// import surface).
export { KeyValue, type KeyValueEntry, type KeyValueProps } from "./components/key-value/pdfx-key-value";
export { PageFooter, type PageFooterProps } from "./components/page-footer/pdfx-page-footer";
export { PageHeader, type PageHeaderProps } from "./components/page-header/pdfx-page-header";
export { PdfImage, type PdfImageProps } from "./components/pdf-image/pdfx-pdf-image";
export { PdfQRCode, type PdfQRCodeProps } from "./components/qrcode/pdfx-qrcode";
export { Section, type SectionProps } from "./components/section/pdfx-section";
export {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHeader,
  TableRow,
} from "./components/table/pdfx-table";
export type {
  TableCellProps,
  TableProps,
  TableRowProps,
  TableSectionProps,
  TableVariant,
} from "./components/table/pdfx-table.types";
export { Text } from "./components/text/pdfx-text";
