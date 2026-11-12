import { type RevenueType } from "@/lib/queries/metrics"
import { WidgetsGrid } from "@/components/dashboard/widgets-grid"
import { ChartCardErrorBoundary } from "@/components/dashboard/chart-card"
import { StoryHeadline } from "@/components/dashboard/overview/story-headline"
import { CashStoryChart } from "@/components/dashboard/overview/cash-story-chart"
import { WhatMovesIt } from "@/components/dashboard/overview/what-moves-it"
import { InsightsCarousel } from "@/components/dashboard/overview/insights-carousel"
import { NeedsAttention } from "@/components/dashboard/overview/needs-attention"

/**
 * The Overview tells one story, top to bottom: a plain-language lede, the
 * cash balance (actual → forecast) with what moved it, insights and the
 * things waiting on you, then the user's own widgets. The Metrics tab is the
 * power-user space.
 */
const OverviewTab = ({
  orgId,
  currency,
  from,
  to,
  revenueType,
  displayCurrency,
  fxRate,
}: {
  orgId: string
  currency: string
  from: string
  to: string
  revenueType: RevenueType
  displayCurrency: string
  fxRate: number
}) => {
  const shared = { orgId, currency, displayCurrency, fxRate }

  return (
    <div className='flex min-w-0 flex-col gap-6 p-4 md:p-6'>
      {/* Lede — composed locally for now (TODO(assistant) in lib/queries/overview-story.ts). */}
      <ChartCardErrorBoundary>
        <StoryHeadline {...shared} from={from} to={to} />
      </ChartCardErrorBoundary>

      <div className='grid min-w-0 gap-6 lg:grid-cols-3'>
        <div className='min-w-0 lg:col-span-2'>
          <ChartCardErrorBoundary>
            <CashStoryChart {...shared} />
          </ChartCardErrorBoundary>
        </div>
        <div className='min-w-0'>
          <ChartCardErrorBoundary>
            <WhatMovesIt {...shared} from={from} to={to} />
          </ChartCardErrorBoundary>
        </div>
      </div>

      <div className='grid min-w-0 gap-6 lg:grid-cols-3'>
        <div className='min-w-0 lg:col-span-2'>
          <ChartCardErrorBoundary>
            <InsightsCarousel {...shared} from={from} to={to} />
          </ChartCardErrorBoundary>
        </div>
        <div className='min-w-0'>
          <ChartCardErrorBoundary>
            <NeedsAttention orgId={orgId} displayCurrency={displayCurrency} fxRate={fxRate} />
          </ChartCardErrorBoundary>
        </div>
      </div>

      <WidgetsGrid
        orgId={orgId}
        currency={currency}
        from={from}
        to={to}
        revenueType={revenueType}
        displayCurrency={displayCurrency}
        fxRate={fxRate}
      />
    </div>
  )
}

export default OverviewTab
