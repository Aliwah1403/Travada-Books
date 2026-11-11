import { type RevenueType } from "@/lib/queries/metrics"
import { WidgetsGrid } from "@/components/dashboard/widgets-grid"
import { ChartCardErrorBoundary } from "@/components/dashboard/chart-card"
import { BriefingStrip } from "@/components/dashboard/overview/briefing-strip"
import { CashCalendar } from "@/components/dashboard/overview/cash-calendar"

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
  return (
    <div className='flex flex-col gap-6 p-6'>
      {/*
        Briefing strip — today's few things worth knowing, each with one
        action. Composed locally for now; the assistant will generate it
        (see TODO(assistant) in lib/queries/briefing.ts). The assistant's
        input + suggested-action chips may also land here later.
      */}
      <ChartCardErrorBoundary>
        <BriefingStrip
          orgId={orgId}
          currency={currency}
          displayCurrency={displayCurrency}
          fxRate={fxRate}
        />
      </ChartCardErrorBoundary>

      <ChartCardErrorBoundary>
        <CashCalendar
          orgId={orgId}
          currency={currency}
          displayCurrency={displayCurrency}
          fxRate={fxRate}
        />
      </ChartCardErrorBoundary>

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
