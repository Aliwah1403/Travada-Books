import { CommandItem } from "@travada-books/ui/components/command"
import { formatCurrency } from "@/lib/format"
import type { TransactionMatchCandidate } from "@/lib/queries/inbox"

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function TransactionMatchItem({
  transaction,
  onSelect,
}: {
  transaction: TransactionMatchCandidate
  onSelect: () => void
}) {
  return (
    <CommandItem value={transaction.id} onSelect={onSelect} className="gap-2">
      <div className="flex w-full min-w-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">
            {transaction.counterparty_name ?? transaction.name}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {formatDate(transaction.date)}
            {transaction.already_matched && (
              <span className="ml-1.5 text-amber-600 dark:text-amber-400">Already matched</span>
            )}
          </p>
        </div>
        <span className="shrink-0 text-xs font-medium tabular-nums">
          {formatCurrency(transaction.amount, transaction.currency)}
        </span>
      </div>
    </CommandItem>
  )
}
