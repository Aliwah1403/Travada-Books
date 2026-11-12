import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  getDashboardPreferences,
  upsertDashboardPreferences,
} from "@/lib/queries/dashboard-preferences"
import {
  DEFAULT_PRIMARY_WIDGETS,
  DEFAULT_VISIBLE_WIDGETS,
  WIDGET_KEYS,
  isWidgetAvailable,
  isWidgetKey,
  type WidgetKey,
} from "@/components/dashboard/widget-registry"

// Fire the persistence call ~100ms after each discrete drag-end event
// (matching Midday's own approach) rather than continuously debouncing
// during the drag itself — a single flat delay after the interaction ends.
const SAVE_DELAY_MS = 100

type WidgetContextValue = {
  primaryWidgets: WidgetKey[]
  availableWidgets: WidgetKey[]
  isCustomizing: boolean
  isSaving: boolean
  setIsCustomizing: (value: boolean) => void
  reorderPrimaryWidgets: (newOrder: WidgetKey[]) => void
  moveToAvailable: (widget: WidgetKey) => void
  moveToPrimary: (widget: WidgetKey, newPrimaryOrder: WidgetKey[]) => void
  swapWithLastPrimary: (incoming: WidgetKey, insertIndex: number) => void
}

const WidgetContext = createContext<WidgetContextValue | undefined>(undefined)

/** Drop any saved keys that no longer exist in the registry (e.g. a widget
 * was renamed/removed in a later release). A shorter-than-7 result is left
 * as-is — it's just a smaller primary set, not an error. */
function sanitizePrimaryWidgets(saved: string[]): WidgetKey[] {
  const filtered = saved.filter(isWidgetKey)
  return filtered.length > 0 ? filtered : DEFAULT_PRIMARY_WIDGETS
}

type WidgetProviderProps = {
  orgId: string
  userId: string
  /** Org's ISO-2 country — gates country-specific widgets (e.g. Tax Deadlines). */
  countryCode?: string | null
  children: React.ReactNode
}

export function WidgetProvider({ orgId, userId, countryCode, children }: WidgetProviderProps) {
  const { data } = useQuery({
    queryKey: ["dashboard-preferences", orgId, userId],
    queryFn: () => getDashboardPreferences(orgId, userId),
  })

  const [primaryWidgets, setPrimaryWidgets] = useState<WidgetKey[]>(DEFAULT_PRIMARY_WIDGETS)
  const [isCustomizing, setIsCustomizing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Only sync from the loaded query once — after that, local state (driven
  // by drag interactions) is the source of truth until the next full mount.
  const hasSyncedRef = useRef(false)

  useEffect(() => {
    if (data === undefined) return // query still loading
    if (hasSyncedRef.current) return
    hasSyncedRef.current = true
    setPrimaryWidgets(data === null ? DEFAULT_PRIMARY_WIDGETS : sanitizePrimaryWidgets(data.primary_widgets))
  }, [data])

  // ─── Availability gating ─────────────────────────────────────────────────
  // `primaryWidgets` state keeps the user's full list, including keys that
  // are unavailable for this org (e.g. Tax Deadlines outside a supported
  // country). Consumers only ever see the filtered list, and every write
  // re-appends the hidden keys, so filtering alone never rewrites the saved
  // preference. The defaults are additionally capped at
  // DEFAULT_VISIBLE_WIDGETS because DEFAULT_PRIMARY_WIDGETS lists a spare
  // that only shows when a country-gated widget drops out.
  const isAvailable = useCallback(
    (key: WidgetKey) => isWidgetAvailable(key, { countryCode }),
    [countryCode],
  )

  const visiblePrimaryWidgets = useMemo(() => {
    const visible = primaryWidgets.filter(isAvailable)
    return primaryWidgets === DEFAULT_PRIMARY_WIDGETS ? visible.slice(0, DEFAULT_VISIBLE_WIDGETS) : visible
  }, [primaryWidgets, isAvailable])

  const availableWidgets = useMemo(
    () => WIDGET_KEYS.filter((key) => isAvailable(key) && !visiblePrimaryWidgets.includes(key)),
    [visiblePrimaryWidgets, isAvailable],
  )

  /** Visible next-state + the hidden keys from `prev`, preserved for
   * persistence. Defaults aren't a saved preference, so their hidden keys
   * aren't carried into the first save. */
  const withHidden = useCallback(
    (nextVisible: WidgetKey[], prev: WidgetKey[]) =>
      prev === DEFAULT_PRIMARY_WIDGETS
        ? nextVisible
        : [...nextVisible, ...prev.filter((key) => !isAvailable(key) && !nextVisible.includes(key))],
    [isAvailable],
  )

  const visibleOf = useCallback(
    (prev: WidgetKey[]) => {
      const visible = prev.filter(isAvailable)
      return prev === DEFAULT_PRIMARY_WIDGETS ? visible.slice(0, DEFAULT_VISIBLE_WIDGETS) : visible
    },
    [isAvailable],
  )

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  const persist = useCallback(
    (next: WidgetKey[]) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(async () => {
        setIsSaving(true)
        try {
          await upsertDashboardPreferences(orgId, userId, next)
        } catch {
          toast.error("Couldn't save your dashboard layout")
        } finally {
          setIsSaving(false)
        }
      }, SAVE_DELAY_MS)
    },
    [orgId, userId],
  )

  // Callers pass/derive orders from the visible list; `withHidden` puts the
  // gated-out keys back before state + persistence.
  const reorderPrimaryWidgets = useCallback(
    (newOrder: WidgetKey[]) => {
      setPrimaryWidgets((prev) => {
        const next = withHidden(newOrder, prev)
        persist(next)
        return next
      })
    },
    [persist, withHidden],
  )

  const moveToAvailable = useCallback(
    (widget: WidgetKey) => {
      setPrimaryWidgets((prev) => {
        const next = withHidden(
          visibleOf(prev).filter((w) => w !== widget),
          prev,
        )
        persist(next)
        return next
      })
    },
    [persist, withHidden, visibleOf],
  )

  const moveToPrimary = useCallback(
    (_widget: WidgetKey, newPrimaryOrder: WidgetKey[]) => {
      setPrimaryWidgets((prev) => {
        const next = withHidden(newPrimaryOrder, prev)
        persist(next)
        return next
      })
    },
    [persist, withHidden],
  )

  // Already-at-capacity case: drop the last primary widget, splice the
  // incoming one in at insertIndex. slice(0, -1) always removes exactly one
  // element, and splice always adds exactly one back, so a 7-length input
  // always yields a 7-length output.
  const swapWithLastPrimary = useCallback(
    (incoming: WidgetKey, insertIndex: number) => {
      setPrimaryWidgets((prev) => {
        const visible = visibleOf(prev).slice(0, -1)
        visible.splice(insertIndex, 0, incoming)
        const next = withHidden(visible, prev)
        persist(next)
        return next
      })
    },
    [persist, withHidden, visibleOf],
  )

  const value: WidgetContextValue = {
    primaryWidgets: visiblePrimaryWidgets,
    availableWidgets,
    isCustomizing,
    isSaving,
    setIsCustomizing,
    reorderPrimaryWidgets,
    moveToAvailable,
    moveToPrimary,
    swapWithLastPrimary,
  }

  return <WidgetContext.Provider value={value}>{children}</WidgetContext.Provider>
}

function useWidgetContext() {
  const ctx = useContext(WidgetContext)
  if (!ctx) throw new Error("Widget hooks must be used within a WidgetProvider")
  return ctx
}

export function usePrimaryWidgets() {
  return useWidgetContext().primaryWidgets
}

export function useAvailableWidgets() {
  return useWidgetContext().availableWidgets
}

export function useIsCustomizing() {
  return useWidgetContext().isCustomizing
}

export function useWidgetActions() {
  const ctx = useWidgetContext()
  return {
    setIsCustomizing: ctx.setIsCustomizing,
    reorderPrimaryWidgets: ctx.reorderPrimaryWidgets,
    moveToAvailable: ctx.moveToAvailable,
    moveToPrimary: ctx.moveToPrimary,
    swapWithLastPrimary: ctx.swapWithLastPrimary,
  }
}
