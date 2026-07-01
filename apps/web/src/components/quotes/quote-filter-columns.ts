import { createColumnConfigHelper } from "@bazza-ui/filters";
import {
  Calendar01Icon,
  Wallet01Icon,
  FilterIcon,
  UserIcon,
} from "@travada-books/ui/icons";
import { parseDateOnly } from "@/lib/format-date";

type QuoteRow = {
  issueDate: string | null;
  validUntil: string | null;
  amount: number;
  status: string;
  customerId: string | null;
};

const dtf = createColumnConfigHelper<QuoteRow>();

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
  { value: "expired", label: "Expired" },
];

export function createQuoteColumnsConfig(
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
      .id("validUntil")
      .accessor((row) =>
        row.validUntil ? parseDateOnly(row.validUntil) : new Date(),
      )
      .displayName("Valid Until")
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
  ] as const;
}

export type QuoteColumnsConfig = ReturnType<typeof createQuoteColumnsConfig>;
