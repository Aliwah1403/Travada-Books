import { Mail01Icon, Upload01Icon, type Icon } from "@travada-books/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@travada-books/ui/components/tooltip"
import { cn } from "@travada-books/ui/lib/utils"
import type { InboxItem } from "@/lib/queries/inbox"

export type InboxSource = "email" | "upload" | "gmail" | "outlook"

// Gmail/Outlook are dormant until Phase 4 (OAuth sync) lands and starts
// writing meta.source itself — the icon/tooltip mapping is ready in advance
// so that phase only needs to set the value, not touch this file.
const SOURCE_CONFIG: Record<InboxSource, { icon: Icon; tooltip: string }> = {
  email: { icon: Mail01Icon, tooltip: "Received by email" },
  upload: { icon: Upload01Icon, tooltip: "Uploaded manually" },
  gmail: { icon: Mail01Icon, tooltip: "Synced from Gmail" },
  outlook: { icon: Mail01Icon, tooltip: "Synced from Outlook" },
}

function getInboxSource(item: Pick<InboxItem, "meta">): InboxSource | null {
  const source = item.meta?.source
  if (source === "email" || source === "upload" || source === "gmail" || source === "outlook") {
    return source
  }
  return null
}

export function InboxSourceIcon({
  item,
  className,
}: {
  item: Pick<InboxItem, "meta">
  className?: string
}) {
  const source = getInboxSource(item)
  if (!source) return null

  const { icon: SourceIcon, tooltip } = SOURCE_CONFIG[source]

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className={cn("inline-flex shrink-0 cursor-default items-center", className)} />
        }
      >
        <SourceIcon size={12} className="text-muted-foreground" />
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}
