import { toast } from "sonner"
import { InboxIcon, Copy01Icon } from "@travada-books/ui/icons"

export function InboxGetStarted({ inboxEmail }: { inboxEmail: string | null }) {
  function copyEmail() {
    if (!inboxEmail) return
    navigator.clipboard.writeText(inboxEmail)
    toast.success("Inbox email copied to clipboard")
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center animate-in fade-in-0 slide-in-from-bottom-2 duration-300 [animation-timing-function:var(--ease-out)]">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <InboxIcon size={20} className="text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">Your inbox is empty</p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          Drop receipts and invoices here, or forward them to your inbox address below.
        </p>
      </div>
      {inboxEmail && (
        <button
          onClick={copyEmail}
          className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 transition-colors fine-hover:bg-muted active:opacity-80"
          title="Copy inbox email"
        >
          <span className="text-xs font-medium">{inboxEmail}</span>
          <Copy01Icon size={13} className="text-muted-foreground" />
        </button>
      )}
      <p className="text-[11px] text-muted-foreground opacity-60">
        Connect Gmail / Outlook — coming soon
      </p>
    </div>
  )
}
