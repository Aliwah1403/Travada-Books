import { createContext, useContext } from "react"
import type { DashboardLayout, DashboardLayoutItem, TileKey } from "@/lib/dashboard-layout"

/** Last layout write: shown as "Saving…", "Saved" or "Not saved" in Customize mode. */
export type SaveStatus = "idle" | "saving" | "saved" | "failed"

export type GridLayoutInput = readonly { i: string; x: number; y: number; w: number; h: number }[]

export type DashboardLayoutContextValue = {
  layout: DashboardLayout
  /** Tiles to render — the layout minus country-gated ones this org can't use. */
  visibleItems: DashboardLayoutItem[]
  /** Available tiles not on the dashboard — the Add widget picker's list. */
  hiddenAvailableTiles: TileKey[]
  isCustomizing: boolean
  setIsCustomizing: (value: boolean) => void
  saveStatus: SaveStatus
  /** Merge positions from react-grid-layout; no-op (no save, no undo step) when nothing moved. */
  applyGridLayout: (gridLayout: GridLayoutInput) => void
  hideTile: (key: TileKey) => void
  addTile: (key: TileKey) => void
  resetLayout: () => void
  undo: () => void
  canUndo: boolean
}

// Separate from the provider component so Fast Refresh keeps working.
export const DashboardLayoutContext = createContext<DashboardLayoutContextValue | undefined>(undefined)

export function useDashboardLayout() {
  const ctx = useContext(DashboardLayoutContext)
  if (!ctx) throw new Error("useDashboardLayout must be used within a DashboardLayoutProvider")
  return ctx
}

export function useIsCustomizing() {
  return useDashboardLayout().isCustomizing
}
