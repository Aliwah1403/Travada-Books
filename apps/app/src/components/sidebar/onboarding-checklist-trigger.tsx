import { useEffect, useRef, useState } from "react"
import { useLocation } from "react-router"
import { useMutation, useQuery } from "@tanstack/react-query"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@travada-books/ui/components/popover"
import { ChecklistProgressRing } from "@/components/onboarding/checklist-progress-ring"
import {
  CHECKLIST_STEPS,
  OnboardingChecklist,
} from "@/components/onboarding/onboarding-checklist"
import { useAuth } from "@/contexts/auth-context"
import {
  dismissOnboardingChecklist,
  getOnboardingChecklist,
} from "@/lib/queries/onboarding"

export function OnboardingChecklistTrigger() {
  const [open, setOpen] = useState(false)
  const { orgId, user, profile } = useAuth()

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ["onboarding-checklist", orgId],
    queryFn: () => getOnboardingChecklist(orgId!),
    enabled: Boolean(orgId),
  })

  // Refetching on route change is the ONLY refresh mechanism — do not add
  // invalidateQueries calls to the invoice/customer/payment/transaction
  // mutations. Note `refetchOnMount` does NOT work here: Sidebar is mounted
  // once by AppLayout and stays mounted across every SPA navigation, so it
  // would only ever fire on a full page reload. Completion changes on another
  // route and the user navigates back, so pathname is the right signal. The
  // RPC is five indexed EXISTS lookups — cheaper than five scattered
  // invalidations that each become a thing to forget.
  const { pathname } = useLocation()
  useEffect(() => {
    if (!orgId) return
    void refetch()
  }, [pathname, orgId, refetch])

  // Completion is derived, never stored, so without this an established org
  // that later deletes its only customer would see the checklist resurrect.
  // Firing this once all five steps are true is what makes dismissal
  // permanent. Local state (not a profile refetch) is what hides the
  // trigger immediately on success — same fire-and-forget approach as
  // markTransactionsVaultNudgeSeen in app-layout.tsx, which also doesn't
  // refresh the profile and instead relies on local state.
  const [locallyDismissed, setLocallyDismissed] = useState(false)
  const hasAutoDismissedRef = useRef(false)

  const { mutate: dismiss } = useMutation({
    mutationFn: () => dismissOnboardingChecklist(user!.id),
    onSuccess: () => setLocallyDismissed(true),
  })

  useEffect(() => {
    if (!status || !user) return
    // Held back while the popover is open so the "You're all set up." state
    // stays reachable: finish the last step with the list open and you see it,
    // then closing the popover dismisses for good. Closed, it just disappears.
    if (open) return
    if (profile?.onboarding_checklist_dismissed_at) return
    if (hasAutoDismissedRef.current) return

    const allDone = CHECKLIST_STEPS.every((step) => status[step.id])
    if (!allDone) return

    hasAutoDismissedRef.current = true
    dismiss()
  }, [status, user, open, profile?.onboarding_checklist_dismissed_at, dismiss])

  if (!orgId) return null
  if (isLoading || !status) return null
  if (profile?.onboarding_checklist_dismissed_at) return null
  if (locallyDismissed) return null

  const total = CHECKLIST_STEPS.length
  const done = CHECKLIST_STEPS.filter((step) => status[step.id]).length
  const pct = total === 0 ? 0 : (done / total) * 100

  function handleDismiss() {
    setOpen(false)
    dismiss()
  }

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
          status={status}
          onNavigate={() => setOpen(false)}
          onDismiss={handleDismiss}
        />
      </PopoverContent>
    </Popover>
  )
}
