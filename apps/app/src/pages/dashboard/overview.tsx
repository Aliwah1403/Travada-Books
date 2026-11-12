import { type RevenueType } from "@/lib/queries/metrics"
import { DashboardGrid } from "@/components/dashboard/dashboard-grid"
import { WeeklySummarySheet } from "@/components/dashboard/overview/weekly-summary-sheet"

/**
 * The Overview tells one story, top to bottom: a plain-language lede, the
 * cash balance (actual → forecast) with what moved it, insights and the
 * things waiting on you, then the user's own widgets. Every block is a tile
 * in the user's saved grid (see lib/dashboard-layout.ts). The Metrics tab is
 * the power-user space.
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
  return (
    <div className='flex min-w-0 flex-col gap-6 p-4 md:p-6'>
      <DashboardGrid
        orgId={orgId}
        currency={currency}
        from={from}
        to={to}
        revenueType={revenueType}
        displayCurrency={displayCurrency}
        fxRate={fxRate}
      />

      {/* Opened by a weekly insight card, or by /insights (the weekly email's link). */}
      <WeeklySummarySheet orgId={orgId} />
    </div>
  )
}

export default OverviewTab
