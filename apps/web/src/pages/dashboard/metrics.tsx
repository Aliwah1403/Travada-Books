import { ChartCardErrorBoundary } from "@/components/dashboard/chart-card";
import { type RevenueType } from "@/lib/queries/metrics";
import { RevenueChart } from "@/components/dashboard/metrics/revenue-chart";
import { CashFlowChart } from "@/components/dashboard/metrics/cash-flow-chart";
import { BurnRateChart } from "@/components/dashboard/metrics/burn-rate-chart";
import { CashPositionChart } from "@/components/dashboard/metrics/cash-position-chart";
import { ExpensesChart } from "@/components/dashboard/metrics/expenses-chart";
import { CategoryExpensesChart } from "@/components/dashboard/metrics/category-expenses-chart";
import { ProfitChart } from "@/components/dashboard/metrics/profit-chart";
import { CustomerActivityChart } from "@/components/dashboard/metrics/customer-activity-chart";
import { QuoteConversionChart } from "@/components/dashboard/metrics/quote-conversion-chart";

const MetricsTab = ({
  orgId,
  currency,
  from,
  to,
  revenueType,
  displayCurrency,
  fxRate,
}: {
  orgId: string;
  currency: string;
  from: string;
  to: string;
  revenueType: RevenueType;
  displayCurrency: string;
  fxRate: number;
}) => {
  return (
    <div className='grid grid-cols-1 gap-6 p-6 lg:grid-cols-2'>
      <div className='lg:col-span-2'>
        <ChartCardErrorBoundary>
          <RevenueChart
            orgId={orgId}
            currency={currency}
            from={from}
            to={to}
            revenueType={revenueType}
            displayCurrency={displayCurrency}
            fxRate={fxRate}
          />
        </ChartCardErrorBoundary>
      </div>
      <div className='lg:col-span-2'>
        <ChartCardErrorBoundary>
          <CashFlowChart
            orgId={orgId}
            currency={currency}
            from={from}
            to={to}
            displayCurrency={displayCurrency}
            fxRate={fxRate}
          />
        </ChartCardErrorBoundary>
      </div>

      {/* Compact, non-time-series pair — sits side by side on lg to break up
          the monotony of stacked full-width time-series cards. */}
      <ChartCardErrorBoundary>
        <CategoryExpensesChart
          orgId={orgId}
          currency={currency}
          from={from}
          to={to}
          displayCurrency={displayCurrency}
          fxRate={fxRate}
        />
      </ChartCardErrorBoundary>
      <ChartCardErrorBoundary>
        <CustomerActivityChart
          orgId={orgId}
          currency={currency}
          from={from}
          to={to}
        />
      </ChartCardErrorBoundary>

      <div className='lg:col-span-2'>
        <ChartCardErrorBoundary>
          <ExpensesChart
            orgId={orgId}
            currency={currency}
            from={from}
            to={to}
            displayCurrency={displayCurrency}
            fxRate={fxRate}
          />
        </ChartCardErrorBoundary>
      </div>
      <div className='lg:col-span-2'>
        <ChartCardErrorBoundary>
          <ProfitChart
            orgId={orgId}
            currency={currency}
            from={from}
            to={to}
            displayCurrency={displayCurrency}
            fxRate={fxRate}
          />
        </ChartCardErrorBoundary>
      </div>
      <div className='lg:col-span-2'>
        <ChartCardErrorBoundary>
          <BurnRateChart
            orgId={orgId}
            currency={currency}
            from={from}
            to={to}
            displayCurrency={displayCurrency}
            fxRate={fxRate}
          />
        </ChartCardErrorBoundary>
      </div>

      <ChartCardErrorBoundary>
        <CashPositionChart
          orgId={orgId}
          currency={currency}
          displayCurrency={displayCurrency}
          fxRate={fxRate}
        />
      </ChartCardErrorBoundary>

      <ChartCardErrorBoundary>
        <QuoteConversionChart
          orgId={orgId}
          currency={currency}
          from={from}
          to={to}
        />
      </ChartCardErrorBoundary>
    </div>
  );
};

export default MetricsTab;
