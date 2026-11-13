import { createColumnConfigHelper } from "@bazza-ui/filters";
import {
  Calendar01Icon,
  Wallet01Icon,
  RepeatIcon,
  FilterIcon,
  UserIcon,
} from "@travada-books/ui/icons";
import { parseDateOnly } from "@/lib/format-date";

type InvoiceRow = {
  issueDate: string | null;
  dueDate: string | null;
  amount: number;
  status: string;
  customerId: string | null;
  recurring: boolean;
};

const dtf = createColumnConfigHelper<InvoiceRow>();

/**
 * The rows handed to useDataTableFilters. These pages filter elsewhere (the
 * server, or the page itself), so it's always empty — but typing it is what
 * lets the hook infer the row type instead of `unknown`. One shared constant
 * so the hook's memo doesn't rebuild columns every render.
 */
export const FILTER_ROWS: InvoiceRow[] = [];

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "unpaid", label: "Unpaid" },
  { value: "partially_paid", label: "Part-paid" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
  { value: "canceled", label: "Canceled" },
  { value: "scheduled", label: "Scheduled" },
];

export function createInvoiceColumnsConfig(
  customers: { id: string; name: string }[],
) {
  const customerOptions = customers.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  return [
    dtf
      .date()
      .id("issueDate")
      .accessor((row) =>
        row.issueDate ? parseDateOnly(row.issueDate) : new Date(),
      )
      .displayName("Issue Date")
      .icon(Calendar01Icon)
      .build(),

    dtf
      .date()
      .id("dueDate")
      .accessor((row) =>
        row.dueDate ? parseDateOnly(row.dueDate) : new Date(),
      )
      .displayName("Due Date")
      .icon(Calendar01Icon)
      .build(),

    dtf
      .number()
      .id("amount")
      .accessor((row) => row.amount)
      .displayName("Amount")
      .icon(Wallet01Icon)
      .min(0)
      .max(1_000_000)
      .build(),

    dtf
      .option()
      .id("status")
      .accessor((row) => row.status)
      .displayName("Status")
      .icon(FilterIcon)
      .options(STATUS_OPTIONS)
      .build(),

    dtf
      .option()
      .id("customer")
      .accessor((row) => row.customerId ?? "")
      .displayName("Customer")
      .icon(UserIcon)
      .options(customerOptions)
      .build(),

    dtf
      .boolean()
      .id("recurring")
      .accessor((row) => row.recurring)
      .displayName("Recurring")
      .icon(RepeatIcon)
      .toggledStateName("Recurring")
      .build(),
  ] as const;
}

export type InvoiceColumnsConfig = ReturnType<
  typeof createInvoiceColumnsConfig
>;
