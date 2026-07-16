import { forwardRef } from "react"
import { cn } from "@travada-books/ui/lib/utils"
import { Checkbox } from "@travada-books/ui/components/checkbox"
import { formatCurrency } from "@/lib/format"
import { InboxStatus } from "@/components/inbox/inbox-status"
import { InboxSourceIcon } from "@/components/inbox/inbox-source-icon"
import type { InboxItem } from "@/lib/queries/inbox"

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

type Props = {
  item: InboxItem
  selected: boolean
  onSelect: () => void
  checked?: boolean
  onToggleCheck?: (id: string) => void
}

export const InboxItemCard = forwardRef<HTMLDivElement, Props>(function InboxItemCard(
  { item, selected, onSelect, checked, onToggleCheck },
  ref,
) {
  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect()
        }
      }}
      className={cn(
        "group flex w-full cursor-pointer items-start gap-2 border-b px-4 py-3 text-left transition-colors last:border-0 active:opacity-80",
        selected ? "bg-muted" : "fine-hover:bg-accent/30",
      )}
    >
      {onToggleCheck && (
        <div
          className={cn(
            "mt-0.5 shrink-0 transition-opacity",
            checked ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox checked={!!checked} onCheckedChange={() => onToggleCheck(item.id)} />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs font-medium">{item.display_name ?? item.file_name}</p>
          {item.amount != null && item.currency && (
            <span className="shrink-0 text-xs font-medium tabular-nums">
              {formatCurrency(item.amount, item.currency)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <InboxSourceIcon item={item} />
            {formatDate(item.date ?? item.created_at)}
          </span>
          <InboxStatus item={item} />
        </div>
      </div>
    </div>
  )
})
