import { useState } from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@travada-books/ui/components/popover"
import { ChecklistProgressRing } from "@/components/onboarding/checklist-progress-ring"
import {
  OnboardingChecklist,
  PLACEHOLDER_ITEMS,
} from "@/components/onboarding/onboarding-checklist"

export function OnboardingChecklistTrigger() {
  // TODO: auto-open on a user's first session once backend state exists to
  // track whether they've seen this before.
  const [open, setOpen] = useState(false)

  // Placeholder-only: the toggle exists so the ring and the complete state can
  // be eyeballed before the backend lands. State lives here, not in the list —
  // the popover unmounts on close, so a child-owned copy would be discarded
  // and the trigger's ring would never move. Once the RPC lands, `items` comes
  // from the query and rows become `<Link to={item.to}>` navigations, which
  // must ALSO call `setOpen(false)` — a Base UI popover does not close itself
  // when a child is clicked.
  const [items, setItems] = useState(PLACEHOLDER_ITEMS)

  function handleToggleItem(id: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item,
      ),
    )
  }

  const total = items.length
  const done = items.filter((item) => item.done).length
  const pct = total === 0 ? 0 : (done / total) * 100

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors text-muted-foreground fine-hover:bg-muted fine-hover:text-foreground active:opacity-80"
          />
        }
      >
        <ChecklistProgressRing pct={pct} className="size-4 shrink-0" />
        <span>Get set up</span>
      </PopoverTrigger>

      <PopoverContent
        side="right"
        align="end"
        sideOffset={8}
        className="w-80 gap-0 p-0 text-sm overflow-hidden"
      >
        <OnboardingChecklist
          items={items}
          onToggleItem={handleToggleItem}
          onDismiss={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  )
}
