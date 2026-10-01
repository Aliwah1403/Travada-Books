// Shared transaction CSV export format — used by both `export-transactions`
// (an ad-hoc export of a chosen set of transactions) and the org data export
// (`org-export.ts`, which pages through every transaction for the whole
// org). Moving this here keeps the two outputs byte-for-byte identical
// instead of two copies drifting apart. `export-transactions.ts`'s own
// output must not change — see its file for what stayed there (the fetch,
// XLSX/attachments bundling, upload/email flow).

export const PAYMENT_MODE_LABELS: Record<string, string> = {
  mpesa: "M-Pesa",
  bank_transfer: "Bank Transfer",
  cash: "Cash",
  cheque: "Cheque",
  card: "Card",
  other: "Other",
};

export const TAX_TYPE_LABELS: Record<string, string> = {
  vat: "VAT",
  wht: "WHT",
  other: "Other",
};

// Prefix with a single quote if the value could be interpreted as a
// spreadsheet formula when the CSV is opened in Excel/Sheets.
export function escapeCell(value: string | number | null | undefined): string | number {
  if (typeof value !== "string") return value ?? "";
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export const COLUMN_HEADERS = [
  "Date",
  "Name",
  "Counterparty",
  "Type",
  "Amount",
  "Currency",
  "Formatted Amount",
  "Category",
  "Status",
  "Payment Mode",
  "Reference Number",
  "Tax Amount",
  "Tax Rate (%)",
  "Tax Type",
  "Recurring",
  "Note",
  "Attachments",
];

// The select string both callers query with — a plain PostgREST select
// (transaction_categories/transaction_attachments joins) that `buildRow`
// below expects the shape of.
export const TRANSACTION_EXPORT_SELECT = `
  id, date, name, counterparty_name, type, amount, currency,
  status, payment_mode, reference_number,
  tax_amount, tax_rate, tax_type,
  recurring, note,
  transaction_categories(name),
  transaction_attachments(file_path, file_name)
`;

export type TransactionExportRow = {
  id: string;
  date: string | null;
  name: string | null;
  counterparty_name: string | null;
  type: string | null;
  amount: number | null;
  currency: string | null;
  status: string | null;
  payment_mode: string | null;
  reference_number: string | null;
  tax_amount: number | null;
  tax_rate: number | null;
  tax_type: string | null;
  recurring: boolean | null;
  note: string | null;
  transaction_categories: { name: string } | null;
  transaction_attachments: { file_path: string; file_name: string }[];
};

export function sanitizeFolderName(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, "-").trim().slice(0, 50);
}

export function buildRow(tx: TransactionExportRow): (string | number)[] {
  const formattedAmount = new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: tx.currency ?? "KES",
    minimumFractionDigits: 2,
  }).format(tx.amount ?? 0);

  const raw: (string | number)[] = [
    tx.date ?? "",
    tx.name ?? "",
    tx.counterparty_name ?? "",
    tx.type === "income" ? "Income" : "Expense",
    tx.amount ?? "",
    tx.currency ?? "",
    formattedAmount,
    (tx.transaction_categories as { name?: string } | null)?.name ?? "",
    tx.status ? tx.status.charAt(0).toUpperCase() + tx.status.slice(1) : "",
    PAYMENT_MODE_LABELS[tx.payment_mode ?? ""] ?? tx.payment_mode ?? "",
    tx.reference_number ?? "",
    tx.tax_amount ?? "",
    tx.tax_rate ?? "",
    TAX_TYPE_LABELS[tx.tax_type ?? ""] ?? tx.tax_type ?? "",
    tx.recurring ? "Yes" : "No",
    tx.note ?? "",
    tx.transaction_attachments?.length
      ? `${tx.transaction_attachments.length} file${tx.transaction_attachments.length !== 1 ? "s" : ""}`
      : "None",
  ];
  return raw.map(escapeCell);
}
