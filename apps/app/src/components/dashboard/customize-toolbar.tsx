import { useState } from "react"
import { Button } from "@travada-books/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@travada-books/ui/components/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@travada-books/ui/components/alert-dialog"
import { Switch } from "@travada-books/ui/components/switch"
import { Tooltip, TooltipContent, TooltipTrigger } from "@travada-books/ui/components/tooltip"
import { ArrowTurnBackwardIcon, PlusSignIcon, ReloadIcon } from "@travada-books/ui/icons"
import { useDashboardLayout } from "@/components/dashboard/dashboard-layout-context"
import { TILE_REGISTRY } from "@/components/dashboard/tile-registry"
import { stackOrder, type TileKey } from "@/lib/dashboard-layout"

const SAVE_LABELS = { idle: null, saving: "Saving…", saved: "Saved", failed: "Not saved" } as const

/** Status of the last layout write. No spinner. */
function SaveStatus() {
  const { saveStatus } = useDashboardLayout()
  return (
    <span
      className={saveStatus === "failed" ? "text-xs text-destructive" : "text-xs text-muted-foreground"}
      aria-live='polite'
    >
      {SAVE_LABELS[saveStatus]}
    </span>
  )
}

function ResetDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { resetLayout } = useDashboardLayout()
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset your Overview?</AlertDialogTitle>
          <AlertDialogDescription>This puts every block back where it started.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              resetLayout()
              onOpenChange(false)
            }}
          >
            Reset
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

type CustomizeToolbarProps = {
  addMenuOpen: boolean
  onAddMenuOpenChange: (open: boolean) => void
  /** Called with the tile just added, so the grid can scroll it into view. */
  onAdded: (key: TileKey) => void
}

/** Desktop Customize mode controls, shown above the grid. */
export function CustomizeToolbar({ addMenuOpen, onAddMenuOpenChange, onAdded }: CustomizeToolbarProps) {
  const { hiddenAvailableTiles, addTile, undo, canUndo, setIsCustomizing } = useDashboardLayout()
  const [resetOpen, setResetOpen] = useState(false)

  const sections = hiddenAvailableTiles.filter((key) => TILE_REGISTRY[key].kind === "section")
  const widgets = hiddenAvailableTiles.filter((key) => TILE_REGISTRY[key].kind === "widget")

  function renderItem(key: TileKey) {
    const { label, icon: TileIcon } = TILE_REGISTRY[key]
    return (
      <DropdownMenuItem
        key={key}
        onClick={() => {
          addTile(key)
          onAdded(key)
        }}
      >
        <TileIcon size={14} className='text-muted-foreground' />
        {label}
      </DropdownMenuItem>
    )
  }

  return (
    <div className='flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-2.5 animate-in fade-in-0 duration-150 [animation-timing-function:var(--ease-out)]'>
      <div className='min-w-0'>
        <p className='text-sm font-medium'>Customizing your Overview</p>
        <p className='text-xs text-muted-foreground'>Drag to move, pull an edge to resize</p>
      </div>

      <div className='flex items-center gap-2'>
        <SaveStatus />

        <DropdownMenu open={addMenuOpen} onOpenChange={onAddMenuOpenChange}>
          <DropdownMenuTrigger render={<Button variant='outline' size='sm' />}>
            <PlusSignIcon data-icon='inline-start' />
            Add widget
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-56'>
            {hiddenAvailableTiles.length === 0 ?
              <DropdownMenuItem disabled>Everything's on your dashboard</DropdownMenuItem>
            : <>
                {sections.length > 0 && (
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Sections</DropdownMenuLabel>
                    {sections.map(renderItem)}
                  </DropdownMenuGroup>
                )}
                {sections.length > 0 && widgets.length > 0 && <DropdownMenuSeparator />}
                {widgets.length > 0 && (
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Widgets</DropdownMenuLabel>
                    {widgets.map(renderItem)}
                  </DropdownMenuGroup>
                )}
              </>
            }
          </DropdownMenuContent>
        </DropdownMenu>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant='outline' size='icon' className='size-8' onClick={undo} disabled={!canUndo} aria-label='Undo' />
            }
          >
            <ArrowTurnBackwardIcon />
          </TooltipTrigger>
          <TooltipContent>Undo</TooltipContent>
        </Tooltip>

        <Button variant='outline' size='sm' onClick={() => setResetOpen(true)}>
          <ReloadIcon data-icon='inline-start' />
          Reset
        </Button>

        <Button size='sm' onClick={() => setIsCustomizing(false)}>
          Done
        </Button>
      </div>

      <ResetDialog open={resetOpen} onOpenChange={setResetOpen} />
    </div>
  )
}

/**
 * Phone Customize mode: no dragging or resizing on a one-column stack, so every
 * tile gets a show/hide switch instead.
 */
export function CustomizePhonePanel() {
  const { visibleItems, hiddenAvailableTiles, addTile, hideTile, setIsCustomizing } = useDashboardLayout()
  const rows: { key: TileKey; shown: boolean }[] = [
    ...stackOrder(visibleItems).map((item) => ({ key: item.i, shown: true })),
    ...hiddenAvailableTiles.map((key) => ({ key, shown: false })),
  ]

  return (
    <div className='flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 animate-in fade-in-0 duration-150 [animation-timing-function:var(--ease-out)]'>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <p className='text-sm font-medium'>Customizing your Overview</p>
          <p className='text-xs text-muted-foreground'>Choose what shows on your dashboard</p>
        </div>
        <div className='flex items-center gap-2'>
          <SaveStatus />
          <Button size='sm' onClick={() => setIsCustomizing(false)}>
            Done
          </Button>
        </div>
      </div>

      <ul className='flex flex-col divide-y rounded-md border bg-background'>
        {rows.map(({ key, shown }) => {
          const { label, icon: TileIcon } = TILE_REGISTRY[key]
          const id = `tile-switch-${key}`
          return (
            <li key={key} className='flex items-center gap-3 px-3 py-2.5'>
              <TileIcon size={14} className='shrink-0 text-muted-foreground' />
              <label htmlFor={id} className='min-w-0 flex-1 truncate text-xs'>
                {label}
              </label>
              <Switch
                id={id}
                checked={shown}
                onCheckedChange={(checked) => (checked ? addTile(key) : hideTile(key))}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
