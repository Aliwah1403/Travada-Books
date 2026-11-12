import { useCallback, useEffect, useMemo, useState } from "react"
import { GridLayout, useContainerWidth, type EventCallback, type Layout } from "react-grid-layout"
import "react-grid-layout/css/styles.css"
import "./dashboard-grid.css"
import { Button } from "@travada-books/ui/components/button"
import { Cancel01Icon, DashboardSquare01Icon, DragDropIcon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"
import { EmptyState } from "@/components/shared/empty-state"
import { useDashboardLayout } from "@/components/dashboard/dashboard-layout-context"
import { CustomizePhonePanel, CustomizeToolbar } from "@/components/dashboard/customize-toolbar"
import { TILE_REGISTRY, type TileRenderProps } from "@/components/dashboard/tile-registry"
import { TileModeContext } from "@/components/dashboard/tile-mode"
import { GRID_COLS, GRID_MARGIN, GRID_ROW_HEIGHT, stackOrder, tileSize, type TileKey } from "@/lib/dashboard-layout"

/** Below this container width the grid becomes a one-column stack at natural heights. */
const STACK_BELOW_PX = 768
const MARGIN = [GRID_MARGIN, GRID_MARGIN] as const
const NO_PADDING = [0, 0] as const
const RESIZE_HANDLES = ["se", "e", "s"] as const
/** Elements inside a tile that must never start a drag (the Hide button). */
const NO_DRAG_CLASS = "dashboard-tile-no-drag"
const NO_DRAG_SELECTOR = `.${NO_DRAG_CLASS}`

/** True while a popover, menu or dialog is open — those own Escape. */
function hasOpenLayer() {
  return Boolean(document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]'))
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
}

/** Escape leaves Customize mode; Cmd/Ctrl+Z undoes the last layout change. */
function useCustomizeShortcuts(enabled: boolean) {
  const { setIsCustomizing, undo } = useDashboardLayout()
  useEffect(() => {
    if (!enabled) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return
      if (event.key === "Escape") {
        if (hasOpenLayer()) return
        setIsCustomizing(false)
        return
      }
      if (event.key.toLowerCase() === "z" && (event.metaKey || event.ctrlKey) && !event.shiftKey) {
        if (isTypingTarget(event.target)) return
        event.preventDefault()
        undo()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [enabled, setIsCustomizing, undo])
}

/**
 * Customize-mode chrome over one tile: a dashed ring, a layer that swallows the
 * pointer (so links, buttons and charts underneath stay inert and the drag can
 * start anywhere) and a label chip with a Hide button.
 */
function TileEditChrome({ tileKey }: { tileKey: TileKey }) {
  const { hideTile } = useDashboardLayout()
  const { label } = TILE_REGISTRY[tileKey]
  return (
    <>
      <div
        aria-hidden
        className='dashboard-tile-overlay absolute inset-0 z-10 cursor-grab rounded-lg border border-dashed border-ring/60 transition-colors fine-hover:bg-muted/20'
      />
      <div className='dashboard-tile-chip absolute top-2 right-2 z-20 flex h-7 cursor-grab items-center gap-1.5 rounded-md border bg-background pr-1 pl-2 text-xs shadow-xs'>
        <DragDropIcon size={12} className='text-muted-foreground' />
        <span className='max-w-40 truncate font-medium'>{label}</span>
        <Button
          variant='ghost'
          size='icon-xs'
          className={NO_DRAG_CLASS}
          aria-label={`Hide ${label}`}
          onClick={() => hideTile(tileKey)}
        >
          <Cancel01Icon />
        </Button>
      </div>
    </>
  )
}

/**
 * The Overview as a 12-column react-grid-layout grid (stored layout), or a
 * plain stack on narrow containers. Breakpoint is the container's width, not
 * the viewport's, so an open sidebar on a small laptop also stacks.
 */
export function DashboardGrid(props: TileRenderProps) {
  const { visibleItems, isCustomizing, setIsCustomizing, applyGridLayout } = useDashboardLayout()
  const { width, containerRef, mounted } = useContainerWidth()
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [scrollToKey, setScrollToKey] = useState<TileKey | null>(null)

  useCustomizeShortcuts(isCustomizing)

  const gridLayout = useMemo<Layout>(
    () =>
      visibleItems.map((item) => {
        const { minW, minH } = tileSize(item.i)
        return { ...item, minW, minH }
      }),
    [visibleItems],
  )
  const stacked = useMemo(() => stackOrder(visibleItems), [visibleItems])

  // One drag or resize = one undo step = one save. The stop callbacks get the
  // whole compacted layout, so items RGL shifted (including after a hide or
  // add) reach the provider too. Never `onLayoutChange`: RGL also fires it on
  // mount and width changes.
  const handleStop = useCallback<EventCallback>((layout) => applyGridLayout(layout), [applyGridLayout])

  // Bring a just-added tile (placed at the bottom) into view once it renders.
  useEffect(() => {
    if (!scrollToKey || !visibleItems.some((item) => item.i === scrollToKey)) return
    const frame = requestAnimationFrame(() => {
      const el = containerRef.current?.querySelector(`[data-tile="${scrollToKey}"]`)
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      el?.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" })
      setScrollToKey(null)
    })
    return () => cancelAnimationFrame(frame)
  }, [scrollToKey, visibleItems, containerRef])

  const stackedMode = width < STACK_BELOW_PX
  const isEmpty = visibleItems.length === 0

  function openCustomize() {
    setIsCustomizing(true)
    if (!stackedMode) setAddMenuOpen(true)
  }

  return (
    <div ref={containerRef} className='flex min-w-0 flex-col gap-4'>
      {!mounted ? null : stackedMode ? (
        <TileModeContext.Provider value='stack'>
          {isCustomizing && <CustomizePhonePanel />}
          {isEmpty && !isCustomizing ? (
            <EmptyOverview onCustomize={openCustomize} />
          ) : (
            <div className='flex flex-col gap-4'>
              {stacked.map((item) => (
                <div key={item.i} className='min-w-0'>
                  {TILE_REGISTRY[item.i].render(props)}
                </div>
              ))}
            </div>
          )}
        </TileModeContext.Provider>
      ) : (
        <TileModeContext.Provider value='grid'>
          {isCustomizing && (
            <CustomizeToolbar
              addMenuOpen={addMenuOpen}
              onAddMenuOpenChange={setAddMenuOpen}
              onAdded={setScrollToKey}
            />
          )}
          {isEmpty && !isCustomizing ? (
            <EmptyOverview onCustomize={openCustomize} />
          ) : isEmpty ? (
            <div className='flex h-40 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground'>
              Use Add widget to put something on your Overview
            </div>
          ) : (
            <GridLayout
              className={cn("dashboard-grid", isCustomizing && "is-customizing")}
              width={width}
              layout={gridLayout}
              gridConfig={{ cols: GRID_COLS, rowHeight: GRID_ROW_HEIGHT, margin: MARGIN, containerPadding: NO_PADDING }}
              dragConfig={{ enabled: isCustomizing, cancel: NO_DRAG_SELECTOR }}
              resizeConfig={{ enabled: isCustomizing, handles: RESIZE_HANDLES }}
              onDragStop={isCustomizing ? handleStop : undefined}
              onResizeStop={isCustomizing ? handleStop : undefined}
            >
              {visibleItems.map((item) => (
                <div key={item.i} data-tile={item.i} className='relative min-w-0'>
                  {/* `inert` keeps keyboard focus out of the tile's links/buttons while editing. */}
                  <div className='h-full min-w-0' inert={isCustomizing}>
                    {TILE_REGISTRY[item.i].render(props)}
                  </div>
                  {isCustomizing && <TileEditChrome tileKey={item.i} />}
                </div>
              ))}
            </GridLayout>
          )}
        </TileModeContext.Provider>
      )}
    </div>
  )
}

function EmptyOverview({ onCustomize }: { onCustomize: () => void }) {
  return (
    <EmptyState
      icon={DashboardSquare01Icon}
      title='Your Overview is empty'
      description='Add the blocks and widgets you want to see here.'
      action={
        <Button variant='outline' size='sm' onClick={onCustomize}>
          Add widgets
        </Button>
      }
    />
  )
}
