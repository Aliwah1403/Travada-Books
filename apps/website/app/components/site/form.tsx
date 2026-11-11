import { cn } from "@travada-books/ui/lib/utils"

// Shared by the site's forms (/contact, the /integrations request form, the
// invoice generator).
export const INPUT = "bg-panel text-sm md:text-sm"

// Form feedback (field errors, the error banner, attached-file rows) eases
// in on mount so it doesn't jolt the layout; removal stays instant. The
// global reduced-motion rule collapses it.
export const FEEDBACK_IN = "animate-in fade-in-0 slide-in-from-top-1 duration-150 [animation-timing-function:var(--ease-out)]"

export function FieldMessage({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={`${id}-error`} className={cn("text-xs text-status-overdue", FEEDBACK_IN)}>
      {message}
    </p>
  )
}
