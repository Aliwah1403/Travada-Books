import { createColumnConfigHelper } from "@bazza-ui/filters"
import {
  Calendar01Icon,
  Wallet01Icon,
  RepeatIcon,
  Attachment01Icon,
  FilterIcon,
} from "@travada-books/ui/icons"
import type { TransactionCategory } from "@/lib/queries/transactions"
import { parseDateOnly } from "@/lib/format-date"

type TxRow = {
  name: string
  date: string
  amount: number
  type: "income" | "expense"
  status: string
  categoryId: string | null
  paymentMode: string | null
  recurring: boolean
  hasAttachments: boolean
}

const dtf = createColumnConfigHelper<TxRow>()

const TYPE_OPTIONS = [
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
]

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "excluded", label: "Excluded" },
  { value: "archived", label: "Archived" },
]

const PAYMENT_MODE_OPTIONS = [
  { value: "mpesa", label: "M-Pesa" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
]

export function createTransactionColumnsConfig(categories: TransactionCategory[]) {
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }))

  return [
    dtf.date()
      .id("date")
      .accessor((row) => (row.date ? parseDateOnly(row.date) : new Date()))
      .displayName("Date")
      .icon(Calendar01Icon)
      .build(),

    dtf.number()
      .id("amount")
      .accessor((row) => row.amount)
      .displayName("Amount")
      .icon(Wallet01Icon)
      .min(0)
      .max(10_000_000)
      .build(),

    dtf.option()
      .id("type")
      .accessor((row) => row.type)
      .displayName("Type")
      .icon(FilterIcon)
      .options(TYPE_OPTIONS)
      .build(),

    dtf.option()
      .id("status")
      .accessor((row) => row.status)
      .displayName("Status")
      .icon(FilterIcon)
      .options(STATUS_OPTIONS)
      .build(),

    dtf.option()
      .id("category")
      .accessor((row) => row.categoryId ?? "")
      .displayName("Category")
      .icon(FilterIcon)
      .options(categoryOptions)
      .build(),

    dtf.option()
      .id("paymentMode")
      .accessor((row) => row.paymentMode ?? "")
      .displayName("Payment Mode")
      .icon(FilterIcon)
      .options(PAYMENT_MODE_OPTIONS)
      .build(),

    dtf.boolean()
      .id("recurring")
      .accessor((row) => row.recurring)
      .displayName("Recurring")
      .icon(RepeatIcon)
      .toggledStateName("Recurring")
      .build(),

    dtf.boolean()
      .id("hasAttachment")
      .accessor((row) => row.hasAttachments)
      .displayName("Has Attachment")
      .icon(Attachment01Icon)
      .toggledStateName("Has Attachment")
      .build(),

  ] as const
}

export type TransactionColumnsConfig = ReturnType<typeof createTransactionColumnsConfig>
