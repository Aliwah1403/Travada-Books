import type { ReactNode } from "react"
import {
  FlowConnectionIcon,
  Notification01Icon,
  NewsIcon,
  SparklesIcon,
  Wallet01Icon,
  type Icon,
} from "@travada-books/ui/icons"
import { ChartCardErrorBoundary } from "@/components/dashboard/chart-card"
import { WidgetErrorBoundary } from "@/components/dashboard/widget-error-boundary"
import { StoryHeadline } from "@/components/dashboard/overview/story-headline"
import { CashStoryChart } from "@/components/dashboard/overview/cash-story-chart"
import { WhatMovesIt } from "@/components/dashboard/overview/what-moves-it"
import { InsightsCarousel } from "@/components/dashboard/overview/insights-carousel"
import { NeedsAttention } from "@/components/dashboard/overview/needs-attention"
import {
  WIDGET_KEYS,
  WIDGET_REGISTRY,
  type WidgetAvailabilityContext,
  type WidgetKey,
  type WidgetRenderProps,
} from "@/components/dashboard/widget-registry"
import { SECTION_SIZES, WIDGET_SIZE, type SectionKey, type TileKey } from "@/lib/dashboard-layout"

export type { SectionKey, TileKey }

/** The shared Overview props; each tile picks what its component needs. */
export type TileRenderProps = WidgetRenderProps

type TileRegistryEntry = {
  label: string
  icon: Icon
  kind: "section" | "widget"
  render: (props: TileRenderProps) => ReactNode
  defaultSize: { w: number; h: number }
  minW: number
  minH: number
  /** Omit for tiles every org can use. */
  isAvailable?: (ctx: WidgetAvailabilityContext) => boolean
}

function section(
  key: SectionKey,
  label: string,
  icon: Icon,
  render: (props: TileRenderProps) => ReactNode,
): TileRegistryEntry {
  const { w, h, minW, minH } = SECTION_SIZES[key]
  return {
    label,
    icon,
    kind: "section",
    // Same boundary the Overview uses today, so one broken section never blanks the page.
    render: (props) => <ChartCardErrorBoundary>{render(props)}</ChartCardErrorBoundary>,
    defaultSize: { w, h },
    minW,
    minH,
  }
}

function widget(key: WidgetKey): TileRegistryEntry {
  const { label, icon, component: Widget, isAvailable } = WIDGET_REGISTRY[key]
  return {
    label,
    icon,
    kind: "widget",
    render: (props) => (
      <WidgetErrorBoundary>
        <Widget {...props} />
      </WidgetErrorBoundary>
    ),
    defaultSize: { w: WIDGET_SIZE.w, h: WIDGET_SIZE.h },
    minW: WIDGET_SIZE.minW,
    minH: WIDGET_SIZE.minH,
    isAvailable,
  }
}

const SECTION_TILES: Record<SectionKey, TileRegistryEntry> = {
  // Not a card, so the tile itself scrolls when it's shorter than the text
  // (h-full is auto in the phone stack, so this is a no-op there).
  story: section("story", "Story", NewsIcon, ({ orgId, currency, from, to, displayCurrency, fxRate }) => (
    <div className="h-full overflow-y-auto">
      <StoryHeadline
        orgId={orgId}
        currency={currency}
        from={from}
        to={to}
        displayCurrency={displayCurrency}
        fxRate={fxRate}
      />
    </div>
  )),
  "cash-story": section("cash-story", "Cash", Wallet01Icon, ({ orgId, currency, displayCurrency, fxRate }) => (
    <CashStoryChart orgId={orgId} currency={currency} displayCurrency={displayCurrency} fxRate={fxRate} />
  )),
  "what-moves-it": section(
    "what-moves-it",
    "Where it came from",
    FlowConnectionIcon,
    ({ orgId, currency, from, to, displayCurrency, fxRate }) => (
      <WhatMovesIt
        orgId={orgId}
        currency={currency}
        from={from}
        to={to}
        displayCurrency={displayCurrency}
        fxRate={fxRate}
      />
    ),
  ),
  insights: section("insights", "Insights", SparklesIcon, ({ orgId, currency, from, to, displayCurrency, fxRate }) => (
    <InsightsCarousel
      orgId={orgId}
      currency={currency}
      from={from}
      to={to}
      displayCurrency={displayCurrency}
      fxRate={fxRate}
    />
  )),
  "needs-attention": section(
    "needs-attention",
    "Needs attention",
    Notification01Icon,
    ({ orgId, displayCurrency, fxRate }) => (
      <NeedsAttention orgId={orgId} displayCurrency={displayCurrency} fxRate={fxRate} />
    ),
  ),
}

export const TILE_REGISTRY = {
  ...SECTION_TILES,
  ...(Object.fromEntries(WIDGET_KEYS.map((key) => [key, widget(key)])) as Record<WidgetKey, TileRegistryEntry>),
} satisfies Record<TileKey, TileRegistryEntry>
