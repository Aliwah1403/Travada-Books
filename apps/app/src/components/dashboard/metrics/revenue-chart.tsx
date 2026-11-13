import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  ArrowDownRight01Icon,
  ArrowUpRight01Icon,
  ChartLineData01Icon,
} from "@travada-books/ui/icons";
import { Switch } from "@travada-books/ui/components/switch";
import { cn } from "@travada-books/ui/lib/utils";
import { BarChart } from "@/components/charts/bar-chart";
import { BarChartLoading } from "@/components/charts/bar-chart-loading";
import { Bar } from "@/components/charts/bar";
import { Grid } from "@/components/charts/grid";
import { BarXAxis } from "@/components/charts/bar-x-axis";
import { YAxis } from "@/components/charts/y-axis";
import { ChartTooltip } from "@/components/charts/tooltip";
import { chartCssVars } from "@/components/charts/chart-context";
import { ChartCard, ChartCardError } from "@/components/dashboard/chart-card";
import { getRevenueSummary, type RevenueType } from "@/lib/queries/metrics";
import { previousPeriod } from "@/lib/queries/metrics-extended";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";
import { incomeForMonthUrl } from "@/lib/drilldown";

const STALE_TIME = 2 * 60 * 1000;
const MARGIN = { top: 24, right: 16, bottom: 32, left: 68 };
const PREV_COLOR = "var(--muted-foreground)";

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
  const navigate = useNavigate();
  const [compare, setCompare] = useState(false);
  const prev = useMemo(() => previousPeriod(from, to), [from, to]);

  const current = useQuery({
    queryKey: ["metric", orgId, "get_revenue_summary", from, to, revenueType],
    queryFn: () => getRevenueSummary(orgId, from, to, revenueType),
    staleTime: STALE_TIME,
  });
  // The same-length window right before the range, overlaid month by month
  // (month 1 vs month 1, …). Only fetched once the toggle is on.
  const previous = useQuery({
    queryKey: ["metric", orgId, "get_revenue_summary", prev.from, prev.to, revenueType],
    queryFn: () => getRevenueSummary(orgId, prev.from, prev.to, revenueType),
    staleTime: STALE_TIME,
    enabled: compare,
  });

  const { chartData, currentTotal, previousTotal } = useMemo(() => {
    const cur = current.data ?? [];
    const prv = previous.data ?? [];
    return {
      chartData: cur.map((m, i) => ({
        date: parseISO(m.month),
        label: format(parseISO(m.month), "MMM yy"),
        revenue: m.revenue * fxRate,
        previous: (prv[i]?.revenue ?? 0) * fxRate,
      })),
      currentTotal: cur.reduce((s, m) => s + m.revenue, 0) * fxRate,
      previousTotal: prv.reduce((s, m) => s + m.revenue, 0) * fxRate,
    };
  }, [current.data, previous.data, fxRate]);

  if (current.isError || (compare && previous.isError))
    return (
      <ChartCardError
        title='Revenue'
        icon={ChartLineData01Icon}
        onRetry={() => {
          void current.refetch();
          if (compare) void previous.refetch();
        }}
      />
    );

  const showCompare = compare && previous.data !== undefined;
  const isLoading = current.isLoading || (compare && previous.isLoading);
  const change =
    showCompare && previousTotal > 0 ?
      (currentTotal - previousTotal) / previousTotal
    : null;
  const up = change != null && change >= 0;
  const ChangeIcon = up ? ArrowUpRight01Icon : ArrowDownRight01Icon;

  return (
    <ChartCard
      title='Revenue'
      icon={ChartLineData01Icon}
      description='Monthly revenue for the selected range · click a month to see its income'
      badge={
        <label className='flex cursor-pointer items-center gap-2 text-xs text-muted-foreground'>
          Compare
          <Switch size='sm' checked={compare} onCheckedChange={setCompare} />
        </label>
      }
    >
      {isLoading ?
        <BarChartLoading aspectRatio='2 / 1' margin={MARGIN} />
      : <div className='flex flex-col gap-3'>
          {showCompare && (
            <div className='flex flex-wrap items-baseline gap-x-2 gap-y-1'>
              <span className='text-xl font-semibold tabular-nums'>
                {formatCurrency(currentTotal, displayCurrency)}
              </span>
              {change != null && (
                <span
                  className={cn(
                    "flex items-center gap-0.5 text-xs font-medium tabular-nums",
                    up ?
                      "text-green-600 dark:text-green-400"
                    : "text-destructive",
                  )}
                >
                  <ChangeIcon size={14} />
                  {up ? "+" : ""}
                  {Math.round(change * 1000) / 10}%
                </span>
              )}
              <span className='text-xs text-muted-foreground'>
                vs {formatCurrency(previousTotal, displayCurrency)} the period
                before
              </span>
            </div>
          )}
          <BarChart
            data={chartData}
            xDataKey='label'
            aspectRatio='2 / 1'
            margin={MARGIN}
            barGap={0.35}
            onBarClick={(point) =>
              navigate(incomeForMonthUrl(point.date as Date))
            }
          >
            <Grid horizontal />
            {showCompare && (
              <Bar dataKey='previous' fill={PREV_COLOR} lineCap='round' />
            )}
            <Bar
              dataKey='revenue'
              fill={chartCssVars.linePrimary}
              lineCap='round'
            />
            <BarXAxis maxLabels={6} />
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
                ...(showCompare ?
                  [
                    {
                      color: PREV_COLOR,
                      label: "Previous period",
                      value: formatCurrency(
                        (point.previous as number) ?? 0,
                        displayCurrency,
                      ),
                    },
                  ]
                : []),
              ]}
            />
          </BarChart>
        </div>
      }
    </ChartCard>
  );
}
