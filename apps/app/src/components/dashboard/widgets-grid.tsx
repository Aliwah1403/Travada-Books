import { useState } from "react"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { DragDropIcon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"
import { WidgetErrorBoundary } from "@/components/dashboard/widget-error-boundary"
import {
  NUMBER_OF_WIDGETS,
  WIDGET_REGISTRY,
  isWidgetKey,
  type WidgetKey,
  type WidgetRenderProps,
} from "@/components/dashboard/widget-registry"
import {
  useAvailableWidgets,
  useIsCustomizing,
  usePrimaryWidgets,
  useWidgetActions,
} from "@/components/dashboard/widget-provider"

// Mirrors the mobile snap-scroll / desktop grid split already used by the
// plain WidgetGrid component, so customize mode doesn't introduce a new
// responsive convention.
const GRID_CLASSES =
  "flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible md:pb-0"

function SortableCard({
  id,
  faded,
  children,
}: {
  id: WidgetKey
  faded?: boolean
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative h-full min-w-[85vw] shrink-0 snap-start cursor-grab active:cursor-grabbing active:scale-[0.97] md:min-w-0 md:shrink",
        faded && "opacity-60 fine-hover:opacity-100 transition-opacity",
        isDragging && "z-50 opacity-100 shadow-lg",
      )}
      {...attributes}
      {...listeners}
    >
      <div className="pointer-events-none absolute right-2 top-2 z-10 flex size-6 items-center justify-center rounded-md bg-background/80 text-muted-foreground shadow-sm backdrop-blur-sm">
        <DragDropIcon size={14} />
      </div>
      {children}
    </div>
  )
}

type WidgetsGridProps = WidgetRenderProps

export function WidgetsGrid(props: WidgetsGridProps) {
  const primaryWidgets = usePrimaryWidgets()
  const availableWidgets = useAvailableWidgets()
  const isCustomizing = useIsCustomizing()
  const { reorderPrimaryWidgets, moveToAvailable, moveToPrimary, swapWithLastPrimary } =
    useWidgetActions()
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const activeKey = active.id as WidgetKey
    const overKey = over.id as WidgetKey
    if (activeKey === overKey) return

    const activeInPrimary = primaryWidgets.includes(activeKey)
    const activeInAvailable = availableWidgets.includes(activeKey)
    const overInPrimary = primaryWidgets.includes(overKey)
    const overInAvailable = availableWidgets.includes(overKey)

    // Reordering within Primary.
    if (activeInPrimary && overInPrimary) {
      const activeIndex = primaryWidgets.indexOf(activeKey)
      const overIndex = primaryWidgets.indexOf(overKey)
      if (activeIndex !== overIndex) {
        reorderPrimaryWidgets(arrayMove(primaryWidgets, activeIndex, overIndex))
      }
      return
    }

    // Available -> Primary: insert at the dropped position, swapping out
    // the last primary widget if already at the 7-widget cap.
    if (activeInAvailable && overInPrimary) {
      const overIndex = primaryWidgets.indexOf(overKey)
      const insertIndex = overIndex >= 0 ? overIndex : primaryWidgets.length

      if (primaryWidgets.length >= NUMBER_OF_WIDGETS) {
        swapWithLastPrimary(activeKey, insertIndex)
      } else {
        const newPrimary = [...primaryWidgets]
        newPrimary.splice(insertIndex, 0, activeKey)
        moveToPrimary(activeKey, newPrimary)
      }
      return
    }

    // Primary -> Available: remove from Primary.
    if (activeInPrimary && overInAvailable) {
      moveToAvailable(activeKey)
    }
  }

  function renderWidget(key: WidgetKey) {
    const Widget = WIDGET_REGISTRY[key].component
    return (
      <WidgetErrorBoundary key={key}>
        <Widget {...props} />
      </WidgetErrorBoundary>
    )
  }

  const activeKey = typeof activeId === "string" && isWidgetKey(activeId) ? activeId : null
  const ActiveWidget = activeKey ? WIDGET_REGISTRY[activeKey].component : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {isCustomizing ? (
        <SortableContext items={primaryWidgets} strategy={rectSortingStrategy}>
          <div className={GRID_CLASSES}>
            {primaryWidgets.map((key) => (
              <SortableCard key={key} id={key}>
                {renderWidget(key)}
              </SortableCard>
            ))}
          </div>
        </SortableContext>
      ) : (
        <div className={GRID_CLASSES}>{primaryWidgets.map(renderWidget)}</div>
      )}

      {isCustomizing && availableWidgets.length > 0 && (
        <>
          <div className="my-8">
            <div className="border-t border-dashed border-border" />
          </div>
          <SortableContext items={availableWidgets} strategy={rectSortingStrategy}>
            <div className={GRID_CLASSES}>
              {availableWidgets.map((key) => (
                <SortableCard key={key} id={key} faded>
                  {renderWidget(key)}
                </SortableCard>
              ))}
            </div>
          </SortableContext>
        </>
      )}

      <DragOverlay>
        {ActiveWidget ? (
          <div className="h-full min-w-[85vw] shrink-0 rounded-lg shadow-lg md:min-w-0">
            <ActiveWidget {...props} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
