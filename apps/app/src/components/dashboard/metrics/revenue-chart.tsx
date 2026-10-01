import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { parseISO } from "date-fns";
import { ChartLineData01Icon } from "@travada-books/ui/icons";
import { BarChart } from "@/components/charts/bar-chart";
import { BarChartLoading } from "@/components/charts/bar-chart-loading";
import { Bar } from "@/components/charts/bar";
import { Grid } from "@/components/charts/grid";
import { XAxis } from "@/components/charts/x-axis";
import { YAxis } from "@/components/charts/y-axis";
import { ChartTooltip } from "@/components/charts/tooltip";
import { chartCssVars } from "@/components/charts/chart-context";
import { ChartCard, ChartCardError } from "@/components/dashboard/chart-card";
import { getRevenueSummary, type RevenueType } from "@/lib/queries/metrics";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";

const STALE_TIME = 2 * 60 * 1000;
const MARGIN = { top: 24, right: 16, bottom: 32, left: 56 };

type RevenueChartProps = {
  orgId: string;
  currency: string;
  from: string;
  to: string;
  revenueType: RevenueType;
  /** Currency to format/plot in — defaults to `currency` (the org's base currency). */
  displayCurrency?: string;
  /** Multiplier applied to already-correct base-currency figures before display. Defaults to 1. */
  fxRate?: number;
};

export function RevenueChart({
  orgId,
  currency,
  from,
  to,
  revenueType,
  displayCurrency = currency,
  fxRate = 1,
}: RevenueChartProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metric", orgId, "get_revenue_summary", from, to, revenueType],
    queryFn: () => getRevenueSummary(orgId, from, to, revenueType),
    staleTime: STALE_TIME,
  });

  const chartData = useMemo(
    () =>
      (data ?? []).map((m) => ({
        date: parseISO(m.month),
        revenue: m.revenue * fxRate,
      })),
    [data, fxRate],
  );

  if (isError)
    return (
      <ChartCardError
        title='Revenue'
        icon={ChartLineData01Icon}
        onRetry={() => refetch()}
      />
    );

  return (
    <ChartCard
      title='Revenue'
      icon={ChartLineData01Icon}
      description='Monthly revenue for the selected range'
    >
      {isLoading ?
        <BarChartLoading aspectRatio='3 / 1' margin={MARGIN} />
      : <BarChart
          data={chartData}
          xDataKey='date'
          aspectRatio='3 / 1'
          margin={MARGIN}
          barGap={0.35}
        >
          <Grid horizontal />
          <Bar
            dataKey='revenue'
            fill={chartCssVars.linePrimary}
            lineCap='round'
          />
          <XAxis />
          <YAxis
            formatValue={(v) => formatCurrencyCompact(v, displayCurrency)}
          />
          <ChartTooltip
            rows={(point) => [
              {
                color: chartCssVars.linePrimary,
                label: "Revenue",
                value: formatCurrency(
                  (point.revenue as number) ?? 0,
                  displayCurrency,
                ),
              },
            ]}
          />
        </BarChart>
      }
    </ChartCard>
  );
}
