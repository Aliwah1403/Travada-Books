import {
  DEFAULT_PRIMARY_WIDGETS,
  DEFAULT_VISIBLE_WIDGETS,
  isWidgetAvailable,
  isWidgetKey,
  type WidgetAvailabilityContext,
  type WidgetKey,
} from "@/components/dashboard/widget-registry"

/**
 * The Overview grid's layout model: pure data + helpers, no React or Supabase.
 * Only the desktop (12-col) layout is stored; phones stack it via `stackOrder`.
 * Plan: Planning/DASHBOARD-GRID-PLAN.md.
 */

export const GRID_COLS = 12
export const GRID_ROW_HEIGHT = 40
export const GRID_MARGIN = 24

export const SECTION_KEYS = ["story", "cash-story", "what-moves-it", "insights", "needs-attention"] as const
export type SectionKey = (typeof SECTION_KEYS)[number]
export type TileKey = SectionKey | WidgetKey

export type TileSize = { w: number; h: number; minW: number; minH: number }

/** Pixel height of a tile `h` rows tall. */
export function tilePixelHeight(h: number): number {
  return h * GRID_ROW_HEIGHT + (h - 1) * GRID_MARGIN
}

// Default `h` = smallest height that fits the block's natural height on the
// 2026-11-12 Overview at desktop width (story 117px, cash story 555, what moves
// it 469, insights 318, needs attention 154, widgets 184–213).
export const SECTION_SIZES: Record<SectionKey, TileSize> = {
  story: { w: 12, h: 3, minW: 6, minH: 2 },
  "cash-story": { w: 8, h: 10, minW: 5, minH: 6 },
  "what-moves-it": { w: 4, h: 8, minW: 3, minH: 4 },
  insights: { w: 8, h: 6, minW: 5, minH: 4 },
  // Natural height (a short list) needs only 3 rows; the floor is 4 so a longer list has room.
  "needs-attention": { w: 4, h: 4, minW: 3, minH: 4 },
}

export const WIDGET_SIZE: TileSize = { w: 3, h: 4, minW: 2, minH: 3 }

export function isSectionKey(key: string): key is SectionKey {
  return (SECTION_KEYS as readonly string[]).includes(key)
}

export function isTileKey(key: string): key is TileKey {
  return isSectionKey(key) || isWidgetKey(key)
}

/** Sections show for every org; widgets may be country-gated. */
export function isTileAvailable(key: TileKey, ctx: WidgetAvailabilityContext): boolean {
  return isSectionKey(key) ? true : isWidgetAvailable(key, ctx)
}

export function tileSize(key: TileKey): TileSize {
  return isSectionKey(key) ? SECTION_SIZES[key] : WIDGET_SIZE
}

export type DashboardLayoutItem = { i: TileKey; x: number; y: number; w: number; h: number }
export type DashboardLayout = { version: 1; items: DashboardLayoutItem[] }

/** Clamp an item into the grid and its tile's minimums. */
function normalizeItem(i: TileKey, x: number, y: number, w: number, h: number): DashboardLayoutItem {
  const size = tileSize(i)
  const cw = Math.min(GRID_COLS, Math.max(size.minW, Math.round(w)))
  return {
    i,
    w: cw,
    x: Math.min(GRID_COLS - cw, Math.max(0, Math.round(x))),
    y: Math.max(0, Math.round(y)),
    h: Math.max(size.minH, Math.round(h)),
  }
}

function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v)
}

/**
 * Validates a stored layout. Unknown keys, duplicates and malformed items are
 * dropped; sizes are clamped. Unavailable (country-gated) keys are kept — the
 * caller hides them with `visibleItems`. Returns null when there is nothing
 * usable, so the caller falls back to the default. A stored empty `items`
 * array is usable: the user hid every tile.
 */
export function parseDashboardLayout(raw: unknown): DashboardLayout | null {
  if (!raw || typeof raw !== "object") return null
  const { version, items } = raw as { version?: unknown; items?: unknown }
  if (version !== 1 || !Array.isArray(items)) return null

  const seen = new Set<TileKey>()
  const out: DashboardLayoutItem[] = []
  for (const item of items) {
    if (!item || typeof item !== "object") continue
    const { i, x, y, w, h } = item as Record<string, unknown>
    if (typeof i !== "string" || !isTileKey(i) || seen.has(i)) continue
    if (!isNum(x) || !isNum(y) || !isNum(w) || !isNum(h)) continue
    seen.add(i)
    out.push(normalizeItem(i, x, y, w, h))
  }
  if (out.length === 0 && items.length > 0) return null
  return { version: 1, items: out }
}

/**
 * The widgets a user with no saved layout sees — what the old widget row showed:
 * their saved `primary_widgets` (known keys, availability-filtered), or the
 * defaults filtered and capped at DEFAULT_VISIBLE_WIDGETS.
 */
export function defaultWidgetsFor(
  savedPrimaryWidgets: string[] | null | undefined,
  isAvailable: (key: WidgetKey) => boolean,
): WidgetKey[] {
  const known = (savedPrimaryWidgets ?? []).filter(isWidgetKey)
  if (known.length > 0) return known.filter(isAvailable)
  return DEFAULT_PRIMARY_WIDGETS.filter(isAvailable).slice(0, DEFAULT_VISIBLE_WIDGETS)
}

/**
 * Today's arrangement: story full width, cash story + what moves it, insights +
 * needs attention, then the widgets 4 per row. Paired sections share the
 * taller one's height so the row reads as one band, as it does today.
 */
export function defaultDashboardLayout(primaryWidgets: WidgetKey[]): DashboardLayout {
  const rows: SectionKey[][] = [["story"], ["cash-story", "what-moves-it"], ["insights", "needs-attention"]]
  const items: DashboardLayoutItem[] = []
  let y = 0
  for (const row of rows) {
    const h = Math.max(...row.map((key) => SECTION_SIZES[key].h))
    let x = 0
    for (const key of row) {
      items.push({ i: key, x, y, w: SECTION_SIZES[key].w, h })
      x += SECTION_SIZES[key].w
    }
    y += h
  }

  const perRow = GRID_COLS / WIDGET_SIZE.w
  const widgets = [...new Set(primaryWidgets)]
  widgets.forEach((key, index) => {
    items.push({
      i: key,
      x: (index % perRow) * WIDGET_SIZE.w,
      y: y + Math.floor(index / perRow) * WIDGET_SIZE.h,
      w: WIDGET_SIZE.w,
      h: WIDGET_SIZE.h,
    })
  })
  return { version: 1, items }
}

/** Items to render. Unavailable ones stay in the saved data. */
export function visibleItems(
  layout: DashboardLayout,
  isAvailable: (key: TileKey) => boolean,
): DashboardLayoutItem[] {
  return layout.items.filter((item) => isAvailable(item.i))
}

/** Adds a tile at the bottom-left at its default size; no-op if already there. */
export function addTile(layout: DashboardLayout, key: TileKey): DashboardLayout {
  if (layout.items.some((item) => item.i === key)) return layout
  const bottom = layout.items.reduce((max, item) => Math.max(max, item.y + item.h), 0)
  const size = tileSize(key)
  return { version: 1, items: [...layout.items, { i: key, x: 0, y: bottom, w: size.w, h: size.h }] }
}

export function removeTile(layout: DashboardLayout, key: TileKey): DashboardLayout {
  if (!layout.items.some((item) => item.i === key)) return layout
  return { version: 1, items: layout.items.filter((item) => item.i !== key) }
}

/**
 * Merges positions coming back from react-grid-layout. Items the grid didn't
 * render (unavailable but saved) are kept as they were. Returns `prev` itself
 * when nothing moved, so callers can skip a save.
 */
export function fromGridLayout(
  prev: DashboardLayout,
  gridLayout: readonly { i: string; x: number; y: number; w: number; h: number }[],
): DashboardLayout {
  const byKey = new Map(gridLayout.map((g) => [g.i, g]))
  let changed = false
  const items = prev.items.map((item) => {
    const g = byKey.get(item.i)
    if (!g) return item
    const next = normalizeItem(item.i, g.x, g.y, g.w, g.h)
    if (next.x === item.x && next.y === item.y && next.w === item.w && next.h === item.h) return item
    changed = true
    return next
  })
  return changed ? { version: 1, items } : prev
}

/** Reading order for the one-column phone stack: top to bottom, then left to right. */
export function stackOrder(items: readonly DashboardLayoutItem[]): DashboardLayoutItem[] {
  return [...items].sort((a, b) => a.y - b.y || a.x - b.x)
}
