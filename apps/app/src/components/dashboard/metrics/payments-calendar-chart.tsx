import { useMemo } from "react"
import { useNavigate } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { addDays, addYears, differenceInCalendarDays, format, getDate, getDay, isAfter, max as maxDate, parseISO, startOfWeek } from "date-fns"
import { Calendar03Icon } from "@travada-books/ui/icons"
import {
  buildHeatmapRowOpacity,
  HeatmapCells,
  HeatmapChart,
  type HeatmapColumn,
  HeatmapInteractionBoundary,
  HeatmapInteractionProvider,
  type HeatmapLevelColors,
  HeatmapLegend,
  HeatmapTooltip,
  HeatmapXAxis,
  HeatmapYAxis,
  useHeatmapInteraction,
} from "@/components/charts/heatmap"
import { ChartCard, ChartCardError } from "@/components/dashboard/chart-card"
import { getDailyIncome, type DailyIncome } from "@/lib/queries/metrics-extended"
import { transactionsDrilldownUrl } from "@/lib/drilldown"
import { formatCurrency } from "@/lib/format"

const STALE_TIME = 2 * 60 * 1000
const TITLE = "When Money Arrives"
const ISO_DATE = "yyyy-MM-dd"
/** Plot height: seven rows of cells up to ~16px plus the month labels. */
const CHART_HEIGHT = 140
const MARGIN = { top: 24, right: 8, bottom: 0, left: 36 }
/** Long ranges scroll sideways on phones rather than shrinking cells to specks. */
const MIN_WIDTH_LONG_RANGE = 620
/** Below this many days with income, the pattern line would be noise. */
const MIN_DAYS_FOR_PATTERN = 8
// Display rows are Monday-first (weekStartDay = 1), so rows 5 and 6 are Sat/Sun.
const WEEKEND_ROW_OPACITY = buildHeatmapRowOpacity([5, 6], 0.55)
// Cell `count` carries a 0–4 intensity level (quartiles of daily income), not
// a raw amount — the library buckets counts 1, 2, 3, 4+ into its five colours.
const LEVEL_COLORS: HeatmapLevelColors = [
  "var(--muted)",
  "color-mix(in oklch, var(--chart-positive, var(--color-emerald-500)) 30%, var(--muted))",
  "color-mix(in oklch, var(--chart-positive, var(--color-emerald-500)) 55%, var(--muted))",
  "color-mix(in oklch, var(--chart-positive, var(--color-emerald-500)) 78%, var(--muted))",
  "var(--chart-positive, var(--color-emerald-500))",
]
const WEEKDAY_PLURAL = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"]

type PaymentsCalendarChartProps = {
  orgId: string
  currency: string
  from: string
  to: string
  /** Currency to format/plot in — defaults to `currency` (the org's base currency). */
  displayCurrency?: string
  /** Multiplier applied to already-correct base-currency figures before display. Defaults to 1. */
  fxRate?: number
}

/** The selected range, capped to its last 12 months. */
function calendarRange(from: string, to: string): { from: string; to: string } {
  const end = parseISO(to)
  const start = maxDate([parseISO(from), addDays(addYears(end, -1), 1)])
  return { from: format(start, ISO_DATE), to }
}

/** Quartile thresholds over days with income → level 1–4 (0 = nothing in). */
function levelFor(amount: number, thresholds: number[]): number {
  if (amount <= 0) return 0
  let level = 1
  for (const t of thresholds) if (amount > t) level += 1
  return Math.min(level, 4)
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo)
}

/** Sunday-first week columns covering [from, to]; the chart rotates to Monday-first. */
function buildColumns(from: string, to: string, byDay: Map<string, DailyIncome>): HeatmapColumn[] {
  const start = startOfWeek(parseISO(from), { weekStartsOn: 0 })
  const end = parseISO(to)
  const sorted = [...byDay.values()].map((d) => d.amount).sort((a, b) => a - b)
  const thresholds = sorted.length > 0 ? [quantile(sorted, 0.25), quantile(sorted, 0.5), quantile(sorted, 0.75)] : []
  const weeks = Math.floor(differenceInCalendarDays(end, start) / 7) + 1

  return Array.from({ length: weeks }, (_, column) => ({
    bin: column,
    bins: Array.from({ length: 7 }, (_, day) => {
      const date = addDays(start, column * 7 + day)
      const income = byDay.get(format(date, ISO_DATE))
      return { bin: day, date, count: income ? levelFor(income.amount, thresholds) : 0 }
    }),
  }))
}

/** "Most money arrives on Fridays and late in the month" — or null when there's no clear pattern. */
function describePattern(days: DailyIncome[]): string | null {
  if (days.length < MIN_DAYS_FOR_PATTERN) return null
  const total = days.reduce((sum, d) => sum + d.amount, 0)
  if (total <= 0) return null

  const byWeekday = new Array<number>(7).fill(0)
  const byPart = [0, 0, 0]
  for (const d of days) {
    const date = parseISO(d.date)
    byWeekday[getDay(date)]! += d.amount
    const dom = getDate(date)
    byPart[dom <= 10 ? 0 : dom <= 20 ? 1 : 2]! += d.amount
  }

  const topDay = byWeekday.indexOf(Math.max(...byWeekday))
  const topDayShare = byWeekday[topDay]! / total
  const topPart = byPart.indexOf(Math.max(...byPart))
  const topPartShare = byPart[topPart]! / total

  // An even spread would be ~14% per weekday and ~33% per third of the month;
  // only call out a clear lean.
  const dayClause = topDayShare >= 0.22 ? `on ${WEEKDAY_PLURAL[topDay]} (${Math.round(topDayShare * 100)}%)` : null
  const partLabel = ["early in the month", "mid-month", "late in the month"][topPart]
  const partClause = topPartShare >= 0.45 ? `${partLabel} (${Math.round(topPartShare * 100)}%)` : null

  if (dayClause && partClause) return `Most money arrives ${dayClause} and ${partClause}.`
  if (dayClause) return `Most money arrives ${dayClause}.`
  if (partClause) return `Most money arrives ${partClause}.`
  return "Money arrives fairly evenly across the week and the month."
}

/** Click a day with income → that day's income transactions. Reads the hovered cell from the heatmap. */
function DrilldownArea({ byDay, children }: { byDay: Map<string, DailyIncome>; children: React.ReactNode }) {
  const navigate = useNavigate()
  const { tooltipData } = useHeatmapInteraction()
  const day = tooltipData ? format(tooltipData.date, ISO_DATE) : null
  const clickable = day != null && byDay.has(day)

  return (
    <div
      className={clickable ? "cursor-pointer" : undefined}
      onClick={() => {
        if (clickable) navigate(transactionsDrilldownUrl({ from: day, to: day, type: "income" }))
      }}
    >
      {children}
    </div>
  )
}

export function PaymentsCalendarChart({
  orgId,
  currency,
  from,
  to,
  displayCurrency = currency,
  fxRate = 1,
}: PaymentsCalendarChartProps) {
  const range = useMemo(() => calendarRange(from, to), [from, to])
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metric", orgId, "daily_income", range.from, range.to],
    queryFn: () => getDailyIncome(orgId, range.from, range.to),
    staleTime: STALE_TIME,
  })

  const byDay = useMemo(() => new Map((data ?? []).map((d) => [d.date, d])), [data])
  const columns = useMemo(() => buildColumns(range.from, range.to, byDay), [range, byDay])
  const pattern = useMemo(() => describePattern(data ?? []), [data])
  const capped = range.from !== from

  if (isError) return <ChartCardError title={TITLE} icon={Calendar03Icon} onRetry={() => refetch()} />

  const rangeStart = parseISO(range.from)
  const rangeEnd = parseISO(range.to)
  const formatLabel = (_level: number, date: Date) => {
    if (isAfter(rangeStart, date) || isAfter(date, rangeEnd)) return "Outside the selected range"
    const income = byDay.get(format(date, ISO_DATE))
    if (!income) return "No money in"
    const payments = income.count === 1 ? "1 payment" : `${income.count} payments`
    return `${formatCurrency(income.amount * fxRate, displayCurrency)} · ${payments}`
  }

  return (
    <ChartCard
      title={TITLE}
      icon={Calendar03Icon}
      description={
        capped
          ? "Money in per day over the last 12 months of the range · click a day to see it"
          : "Money in per day · click a day to see it"
      }
    >
      <HeatmapInteractionProvider>
        <HeatmapInteractionBoundary className="flex flex-col gap-3">
          <div className="-mx-1 overflow-x-auto px-1">
            <div style={{ minWidth: columns.length > 26 ? MIN_WIDTH_LONG_RANGE : undefined, height: CHART_HEIGHT }}>
              <DrilldownArea byDay={byDay}>
                <div style={{ height: CHART_HEIGHT }}>
                  <HeatmapChart
                    data={columns}
                    layout="fill"
                    margin={MARGIN}
                    gap={3}
                    weekStartDay={1}
                    levelColors={LEVEL_COLORS}
                    status={isLoading ? "loading" : "ready"}
                  >
                    <HeatmapCells cornerRadius={2} hideGhostCells={false} rowOpacity={WEEKEND_ROW_OPACITY} />
                    <HeatmapXAxis />
                    <HeatmapYAxis rowOpacity={WEEKEND_ROW_OPACITY} />
                    <HeatmapTooltip formatLabel={formatLabel} />
                  </HeatmapChart>
                </div>
              </DrilldownArea>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {isLoading ? " " : (pattern ?? "Not enough days with money in to spot a pattern yet.")}
            </p>
            <HeatmapLegend colorScale={(level) => LEVEL_COLORS[Math.min(4, Math.max(0, level ?? 0))]!} />
          </div>
        </HeatmapInteractionBoundary>
      </HeatmapInteractionProvider>
    </ChartCard>
  )
}
