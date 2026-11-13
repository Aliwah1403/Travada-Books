import { ChartCardErrorBoundary } from "@/components/dashboard/chart-card";
import { type RevenueType } from "@/lib/queries/metrics";
import { RevenueChart } from "@/components/dashboard/metrics/revenue-chart";
import { PaymentChannelsChart } from "@/components/dashboard/metrics/payment-channels-chart";
import { CategoryExpensesChart } from "@/components/dashboard/metrics/category-expenses-chart";
import { ProfitChart } from "@/components/dashboard/metrics/profit-chart";
import { CashPositionChart } from "@/components/dashboard/metrics/cash-position-chart";
import { ReceivablesAgingChart } from "@/components/dashboard/metrics/receivables-aging-chart";
import { QuoteToCashChart } from "@/components/dashboard/metrics/quote-to-cash-chart";
import { CustomerConcentrationChart } from "@/components/dashboard/metrics/customer-concentration-chart";
import { MoneyFlowChart } from "@/components/dashboard/metrics/money-flow-chart";
import { PaymentsCalendarChart } from "@/components/dashboard/metrics/payments-calendar-chart";

type MetricsTabProps = {
  orgId: string;
  currency: string;
  from: string;
  to: string;
  revenueType: RevenueType;
  displayCurrency: string;
  fxRate: number;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className='flex flex-col gap-3'>
      <h2 className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
        {title}
      </h2>
      <div className='grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2'>
        {children}
      </div>
    </section>
  );
}

/** Spans both columns of a Section's grid on lg (a full-width row). */
function FullWidth({ children }: { children: React.ReactNode }) {
  return <div className='min-w-0 lg:col-span-2'>{children}</div>;
}

// Four sections, each answering one question: half-width charts come in pairs,
// wide charts (Money Flow, When Money Arrives) take a full row. Charts that
// showed the same income-minus-expenses picture (cash flow, burn rate,
// monthly expenses) were folded away; see SESSION.md for the trim.
const MetricsTab = ({
  orgId,
  currency,
  from,
  to,
  revenueType,
  displayCurrency,
  fxRate,
}: MetricsTabProps) => {
  const money = { orgId, currency, from, to, displayCurrency, fxRate };

  return (
    <div className='flex flex-col gap-8 p-4 sm:p-6'>
      <Section title='Money in'>
        <ChartCardErrorBoundary>
          <RevenueChart {...money} revenueType={revenueType} />
        </ChartCardErrorBoundary>
        <ChartCardErrorBoundary>
          <PaymentChannelsChart {...money} />
        </ChartCardErrorBoundary>
      </Section>

      <Section title='Money flow & profit'>
        <FullWidth>
          <ChartCardErrorBoundary>
            <MoneyFlowChart {...money} />
          </ChartCardErrorBoundary>
        </FullWidth>
        <ChartCardErrorBoundary>
          <CategoryExpensesChart {...money} />
        </ChartCardErrorBoundary>
        <ChartCardErrorBoundary>
          <ProfitChart {...money} />
        </ChartCardErrorBoundary>
      </Section>

      <Section title='Getting paid'>
        <ChartCardErrorBoundary>
          <ReceivablesAgingChart {...money} />
        </ChartCardErrorBoundary>
        <ChartCardErrorBoundary>
          <QuoteToCashChart orgId={orgId} from={from} to={to} />
        </ChartCardErrorBoundary>
        <FullWidth>
          <ChartCardErrorBoundary>
            <PaymentsCalendarChart {...money} />
          </ChartCardErrorBoundary>
        </FullWidth>
      </Section>

      <Section title='Cash & customers'>
        <ChartCardErrorBoundary>
          <CashPositionChart {...money} />
        </ChartCardErrorBoundary>
        <ChartCardErrorBoundary>
          <CustomerConcentrationChart {...money} />
        </ChartCardErrorBoundary>
      </Section>
    </div>
  );
};

export default MetricsTab;
