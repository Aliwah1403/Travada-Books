import { type ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router";
import { RepeatIcon, Attachment01Icon } from "@travada-books/ui/icons";
import { TransactionActions } from "./transaction-actions";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData> {
    onEditTransaction?: (id: string) => void;
    onDeleteTransaction?: (id: string) => void;
  }
}

export type TransactionStatus =
  | "pending"
  | "completed"
  | "excluded"
  | "archived";
export type PaymentMode =
  | "mpesa"
  | "bank_transfer"
  | "cash"
  | "cheque"
  | "card"
  | "other";
export type TransactionFrequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "semi_monthly"
  | "annually"
  | "irregular";

export type TransactionAttachmentInfo = {
  id: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  content_type: string | null;
};

export type Transaction = {
  id: string;
  date: string;
  name: string;
  counterpartyName: string | null;
  type: "income" | "expense";
  amount: number; // always positive
  taxAmount: number | null;
  taxRate: number | null;
  taxType: "vat" | "wht" | "other" | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  currency: string;
  status: TransactionStatus;
  paymentMode: PaymentMode | null;
  recurring: boolean;
  frequency: TransactionFrequency | null;
  internal: boolean;
  referenceNumber: string | null;
  note: string | null;
  linkedInvoiceId: string | null;
  linkedInvoiceNumber: string | null;
  hasAttachments: boolean;
  attachments: TransactionAttachmentInfo[];
};

const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  mpesa: "M-Pesa",
  bank_transfer: "Bank",
  cash: "Cash",
  cheque: "Cheque",
  card: "Card",
  other: "Other",
};

const STATUS_CONFIG: Record<
  TransactionStatus,
  { label: string; className: string } | null
> = {
  completed: null, // default — don't show badge
  pending: {
    label: "Pending",
    className:
      "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
  },
  excluded: {
    label: "Excluded",
    className: "bg-muted text-muted-foreground border border-border",
  },
  archived: {
    label: "Archived",
    className: "bg-muted text-muted-foreground border border-border",
  },
};

export const transactionColumns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "date",
    header: "Date",
    enableSorting: true,
    cell: ({ row }) => (
      <span className='text-xs text-muted-foreground whitespace-nowrap'>
        {row.original.date}
      </span>
    ),
  },
  {
    accessorKey: "name",
    header: "Description",
    enableSorting: true,
    cell: ({ row }) => (
      <span className='text-xs font-medium truncate'>{row.original.name}</span>
    ),
  },
  {
    accessorKey: "counterpartyName",
    header: "To / From",
    cell: ({ row }) => {
      const name = row.original.counterpartyName;
      return name ?
          <span className='text-xs text-muted-foreground truncate'>{name}</span>
        : <span className='text-xs text-muted-foreground/40'>—</span>;
    },
  },
  {
    accessorKey: "categoryName",
    header: "Category",
    cell: ({ row }) => {
      const { categoryName, categoryColor } = row.original;
      if (!categoryName) {
        return <span className='text-xs text-muted-foreground'>—</span>;
      }
      return (
        <div className='flex items-center gap-2'>
          <div
            className='size-2 rounded-full shrink-0'
            style={{ backgroundColor: categoryColor ?? "gray" }}
          />
          <span className='text-xs truncate'>{categoryName}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    enableHiding: false,
    cell: ({ row }) => {
      const config = STATUS_CONFIG[row.original.status];
      if (!config)
        return <span className='text-xs text-muted-foreground'>—</span>;
      return (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${config.className}`}
        >
          {config.label}
        </span>
      );
    },
  },
  {
    accessorKey: "paymentMode",
    header: "Payment",
    cell: ({ row }) => {
      const mode = row.original.paymentMode;
      if (!mode)
        return <span className='text-xs text-muted-foreground'>—</span>;
      return (
        <span className='text-xs text-muted-foreground'>
          {PAYMENT_MODE_LABELS[mode]}
        </span>
      );
    },
  },
  {
    accessorKey: "amount",
    header: "Amount",
    enableSorting: true,
    cell: ({ row }) => {
      const { amount, currency, type } = row.original;
      return (
        <span
          className={
            type === "income" ?
              "text-xs font-medium text-green-600 dark:text-green-400"
            : "text-xs"
          }
        >
          {type === "expense" ? "–" : "+"}{currency}{" "}
          {amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
        </span>
      );
    },
  },
  {
    accessorKey: "taxAmount",
    header: "Tax",
    enableHiding: true,
    cell: ({ row }) => {
      const { taxAmount, currency } = row.original;
      if (!taxAmount)
        return <span className='text-xs text-muted-foreground'>—</span>;
      return (
        <span className='text-xs text-muted-foreground'>
          {currency}{" "}
          {taxAmount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
        </span>
      );
    },
  },
  {
    id: "recurring",
    header: "Recurring",
    enableHiding: true,
    cell: ({ row }) =>
      row.original.recurring ?
        <RepeatIcon size={14} className='text-muted-foreground' />
      : null,
  },
  {
    id: "linkedInvoice",
    header: "Invoice",
    enableHiding: true,
    cell: ({ row }) => {
      const { linkedInvoiceId, linkedInvoiceNumber } = row.original;
      if (!linkedInvoiceId || !linkedInvoiceNumber)
        return <span className='text-xs text-muted-foreground/40'>—</span>;
      return (
        <Link
          to={`/invoices/${linkedInvoiceId}`}
          onClick={(e) => e.stopPropagation()}
          className='text-xs font-medium text-foreground underline decoration-muted-foreground/40 underline-offset-2 fine-hover:decoration-foreground transition-colors'
        >
          {linkedInvoiceNumber}
        </Link>
      );
    },
  },
  {
    id: "attachments",
    header: "Attachment",
    enableHiding: false,
    cell: ({ row }) =>
      row.original.hasAttachments ? (
        <Attachment01Icon size={13} className='text-muted-foreground' />
      ) : null,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row, table }) => (
      <TransactionActions
        onEdit={() => table.options.meta?.onEditTransaction?.(row.original.id)}
        onDelete={() =>
          table.options.meta?.onDeleteTransaction?.(row.original.id)
        }
      />
    ),
  },
];

export const DEFAULT_HIDDEN_COLUMNS: Record<string, boolean> = {};
