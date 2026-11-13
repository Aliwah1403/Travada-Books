import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  DashboardLayoutContext,
  type DashboardLayoutContextValue,
  type GridLayoutInput,
  type SaveStatus,
} from "@/components/dashboard/dashboard-layout-context"
import {
  getDashboardPreferences,
  upsertDashboardLayout,
  type DashboardPreferences,
} from "@/lib/queries/dashboard-preferences"
import { WIDGET_KEYS, isWidgetAvailable, type WidgetKey } from "@/components/dashboard/widget-registry"
import {
  SECTION_KEYS,
  addTile as addTileTo,
  defaultDashboardLayout,
  defaultWidgetsFor,
  fromGridLayout,
  isTileAvailable,
  parseDashboardLayout,
  removeTile,
  visibleItems as visibleItemsOf,
  type DashboardLayout,
  type TileKey,
} from "@/lib/dashboard-layout"

/** Saves land this long after the last change, so a burst of edits is one write. */
const SAVE_DELAY_MS = 500
const MAX_UNDO = 20
const ALL_TILE_KEYS: readonly TileKey[] = [...SECTION_KEYS, ...WIDGET_KEYS]

type DashboardLayoutProviderProps = {
  orgId: string
  userId: string
  /** Org's ISO-2 country — gates country-specific widgets (e.g. Tax Deadlines). */
  countryCode?: string | null
  children: React.ReactNode
}

type LocalState = {
  /** Null until the first local change — until then the layout follows the query. */
  layout: DashboardLayout | null
  past: DashboardLayout[]
}

export function DashboardLayoutProvider({ orgId, userId, countryCode, children }: DashboardLayoutProviderProps) {
  const queryClient = useQueryClient()
  const queryKey = useMemo(() => ["dashboard-preferences", orgId, userId], [orgId, userId])
  const { data } = useQuery({ queryKey, queryFn: () => getDashboardPreferences(orgId, userId) })

  const [isCustomizing, setIsCustomizing] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const [local, setLocal] = useState<LocalState>({ layout: null, past: [] })
  // Mirrors `local` so actions can read the current layout without stale closures
  // or side effects inside a setState updater.
  const localRef = useRef(local)

  const isWidgetAvailableHere = useCallback(
    (key: WidgetKey) => isWidgetAvailable(key, { countryCode }),
    [countryCode],
  )
  const isAvailable = useCallback((key: TileKey) => isTileAvailable(key, { countryCode }), [countryCode])

  // Until the user changes something, follow the query (defaults while it loads,
  // and when it fails). After the first change, local state wins, so a refetch
  // never clobbers edits.
  const fromQuery = useMemo(
    () =>
      parseDashboardLayout(data?.layout) ??
      defaultDashboardLayout(defaultWidgetsFor(data?.primary_widgets, isWidgetAvailableHere)),
    [data, isWidgetAvailableHere],
  )
  const layout = local.layout ?? fromQuery
  // Read by the actions below; kept in step after each render (actions also
  // update it themselves so back-to-back calls see each other's result).
  const layoutRef = useRef(layout)
  useLayoutEffect(() => {
    layoutRef.current = layout
  }, [layout])

  // ─── Persistence ──────────────────────────────────────────────────────────
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<DashboardLayout | null>(null)

  const flush = useCallback(async () => {
    saveTimeoutRef.current = null
    const next = pendingRef.current
    pendingRef.current = null
    if (!next) return
    setSaveStatus("saving")
    try {
      await upsertDashboardLayout(orgId, userId, next)
      setSaveStatus("saved")
    } catch {
      setSaveStatus("failed")
      toast.error("Couldn't save your dashboard layout")
    }
  }, [orgId, userId])

  const scheduleSave = useCallback(
    (next: DashboardLayout) => {
      pendingRef.current = next
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(flush, SAVE_DELAY_MS)
    },
    [flush],
  )

  // Leaving the page inside the debounce window still saves.
  useEffect(
    () => () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        void flush()
      }
    },
    [flush],
  )

  // ─── Changes ──────────────────────────────────────────────────────────────
  const commit = useCallback(
    (update: (prev: DashboardLayout) => DashboardLayout) => {
      const prev = layoutRef.current
      const next = update(prev)
      if (next === prev) return
      const state = { layout: next, past: [...localRef.current.past, prev].slice(-MAX_UNDO) }
      localRef.current = state
      layoutRef.current = next
      setLocal(state)
      // Keep the cache in step so a remount shows the edit before its refetch lands.
      queryClient.setQueryData<DashboardPreferences | null>(queryKey, (old) => ({
        primary_widgets: old?.primary_widgets ?? [],
        layout: next,
      }))
      scheduleSave(next)
    },
    [queryClient, queryKey, scheduleSave],
  )

  const applyGridLayout = useCallback(
    (gridLayout: GridLayoutInput) => commit((prev) => fromGridLayout(prev, gridLayout)),
    [commit],
  )
  const hideTile = useCallback((key: TileKey) => commit((prev) => removeTile(prev, key)), [commit])
  const addTile = useCallback((key: TileKey) => commit((prev) => addTileTo(prev, key)), [commit])
  // Back to the standard arrangement with the widgets the user had before
  // customizing (their old `primary_widgets`, else the product defaults), so a
  // reset never swaps out widgets they picked.
  const resetLayout = useCallback(
    () => commit(() => defaultDashboardLayout(defaultWidgetsFor(data?.primary_widgets, isWidgetAvailableHere))),
    [commit, data, isWidgetAvailableHere],
  )

  const undo = useCallback(() => {
    const { past } = localRef.current
    const previous = past[past.length - 1]
    if (!previous) return
    const state = { layout: previous, past: past.slice(0, -1) }
    localRef.current = state
    layoutRef.current = previous
    setLocal(state)
    queryClient.setQueryData<DashboardPreferences | null>(queryKey, (old) => ({
      primary_widgets: old?.primary_widgets ?? [],
      layout: previous,
    }))
    scheduleSave(previous)
  }, [queryClient, queryKey, scheduleSave])

  const visibleItems = useMemo(() => visibleItemsOf(layout, isAvailable), [layout, isAvailable])
  const hiddenAvailableTiles = useMemo(() => {
    const placed = new Set(layout.items.map((item) => item.i))
    return ALL_TILE_KEYS.filter((key) => isAvailable(key) && !placed.has(key))
  }, [layout, isAvailable])

  const value: DashboardLayoutContextValue = {
    layout,
    visibleItems,
    hiddenAvailableTiles,
    isCustomizing,
    setIsCustomizing,
    saveStatus,
    applyGridLayout,
    hideTile,
    addTile,
    resetLayout,
    undo,
    canUndo: local.past.length > 0,
  }

  return <DashboardLayoutContext.Provider value={value}>{children}</DashboardLayoutContext.Provider>
}
