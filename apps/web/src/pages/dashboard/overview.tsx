import { type RevenueType } from "@/lib/queries/metrics"
import { WidgetsGrid } from "@/components/dashboard/widgets-grid"

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
      <WidgetsGrid
        orgId={orgId}
        currency={currency}
        from={from}
        to={to}
        revenueType={revenueType}
        displayCurrency={displayCurrency}
        fxRate={fxRate}
      />

      {/*
        Reserved slot for the assistant input + suggested-action chips
        (future batch). Kept empty on purpose so the page doesn't reflow
        when that lands.
      */}
    </div>
  )
}

export default OverviewTab
