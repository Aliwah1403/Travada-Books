import { useMemo } from "react"
import { Link } from "react-router"
import { format, parseISO } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@travada-books/ui/components/card"
import { Skeleton } from "@travada-books/ui/components/skeleton"
import { ChartLineData01Icon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"
import { AreaChart } from "@/components/charts/area-chart"
import { AreaChartLoading } from "@/components/charts/area-chart-loading"
import { Area } from "@/components/charts/area"
import { Grid } from "@/components/charts/grid"
import { XAxis } from "@/components/charts/x-axis"
import { YAxis } from "@/components/charts/y-axis"
import { ChartTooltip } from "@/components/charts/tooltip"
import { chartCssVars, useChartStable } from "@/components/charts/chart-context"
import { ChartCardError } from "@/components/dashboard/chart-card"
import { useIsMobile } from "@/hooks/use-mobile"
import { formatCurrency, formatCurrencyCompact } from "@/lib/format"
import { CASH_HISTORY_DAYS, type CashMoment, type CashStory } from "@/lib/queries/cash-story"
import type { CashForecast } from "@/lib/queries/forecast"
import { useCashStory } from "./use-overview-data"

const MARGIN = { top: 28, right: 16, bottom: 32, left: 68 }
const TITLE = "Cash"
/** Below this plot width moment labels are dropped (dots + list stay). */
const LABEL_MIN_WIDTH = 420

type CashStoryChartProps = {
  orgId: string
  /** Org base currency — history and forecast are computed in it. */
  currency: string
  displayCurrency: string
  fxRate: number
}

/**
 * One chart of the cash balance: the last 90 days of actual balance (solid)
 * running into the 60-day forecast (dashed, lightly shaded), with a "Today"
 * marker between them and a few auto-picked moments labelled on the line.
 */
export function CashStoryChart({ orgId, currency, displayCurrency, fxRate }: CashStoryChartProps) {
  const { data, forecast, isLoading, isError, refetch } = useCashStory(orgId, currency)
  const isMobile = useIsMobile()
  const aspectRatio = isMobile ? "3 / 2" : "5 / 2"

  const fmt = (base: number) => formatCurrency(base * fxRate, displayCurrency)
  const fmtCompact = (base: number) => formatCurrencyCompact(base * fxRate, displayCurrency)

  const chartData = useMemo(
    () =>
      (data?.points ?? []).map((p) => ({
        date: parseISO(p.date),
        iso: p.date,
        balance: p.balance * fxRate,
        inflow: p.inflow * fxRate,
        outflow: p.outflow * fxRate,
        forecast: p.isForecast ? 1 : 0,
      })),
    [data, fxRate]
  )

  const momentsByDate = useMemo(() => new Map((data?.moments ?? []).map((m) => [m.date, m])), [data])

  if (isError) {
    return (
      <div id="cash-story" className="scroll-mt-6">
        <ChartCardError title={TITLE} icon={ChartLineData01Icon} onRetry={refetch} />
      </div>
    )
  }

  const netMode = data?.mode === "net" || (forecast != null && !forecast.isConfigured)

  return (
    <Card id="cash-story" className="h-full w-full scroll-mt-6">
      <CardHeader className="flex flex-row items-start gap-2 space-y-0">
        <ChartLineData01Icon size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle>{TITLE}</CardTitle>
          <CardDescription>
            {netMode ? (
              <>
                Net cash in and out over the last {CASH_HISTORY_DAYS} days, then the next {forecast?.horizonDays ?? 60}{" "}
                forecast.{" "}
                <Link
                  to="/settings/general"
                  className="font-medium text-primary underline-offset-4 fine-hover:underline"
                >
                  Set an opening balance
                </Link>{" "}
                to see your real balance.
              </>
            ) : (
              `Your balance over the last ${CASH_HISTORY_DAYS} days, then forecast for the next ${forecast?.horizonDays ?? 60} from open invoices, bills and recurring expenses`
            )}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {isLoading || !data || !forecast ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
            <AreaChartLoading aspectRatio={aspectRatio} margin={MARGIN} />
          </>
        ) : (
          <>
            <Summary story={data} fmtCompact={fmtCompact} />

            <div className="min-w-0">
              <AreaChart data={chartData} xDataKey="date" aspectRatio={aspectRatio} margin={MARGIN} fitYDomain>
                <Grid horizontal highlightRowValues={[0]} />
                <ForecastShade todayIndex={data.todayIndex} />
                <Area
                  dataKey="balance"
                  fill={chartCssVars.linePrimary}
                  stroke={chartCssVars.linePrimary}
                  strokeWidth={2.5}
                  fillOpacity={0.15}
                  dashFromIndex={data.todayIndex}
                />
                <XAxis numTicks={isMobile ? 3 : 6} />
                <YAxis formatValue={(v) => formatCurrencyCompact(v, displayCurrency)} />
                <CashStoryAnnotations
                  todayIndex={data.todayIndex}
                  moments={data.moments}
                  fxRate={fxRate}
                  fmtCompact={fmtCompact}
                />
                <ChartTooltip
                  rows={(point) => {
                    const isForecast = point.forecast === 1
                    const rows = [
                      {
                        color: chartCssVars.linePrimary,
                        label: netMode
                          ? isForecast
                            ? "Net position (forecast)"
                            : "Net position"
                          : isForecast
                            ? "Forecast balance"
                            : "Balance",
                        value: formatCurrency((point.balance as number) ?? 0, displayCurrency),
                      },
                    ]
                    const inflow = (point.inflow as number) ?? 0
                    const outflow = (point.outflow as number) ?? 0
                    if (inflow > 0)
                      rows.push({
                        color: "var(--chart-2)",
                        label: isForecast ? "Expected in" : "Money in",
                        value: formatCurrency(inflow, displayCurrency),
                      })
                    if (outflow > 0)
                      rows.push({
                        color: "var(--chart-5)",
                        label: isForecast ? "Expected out" : "Money out",
                        value: formatCurrency(outflow, displayCurrency),
                      })
                    const moment = momentsByDate.get(point.iso as string)
                    if (moment)
                      rows.push({
                        color: "var(--muted-foreground)",
                        label: moment.title,
                        value: momentValue(moment, fmt),
                      })
                    return rows
                  }}
                />
              </AreaChart>
            </div>

            {data.moments.length > 0 && <MomentList moments={data.moments} fmtCompact={fmtCompact} />}

            <Caveats forecast={forecast} />
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Chart layers ──────────────────────────────────────────────────────────────

/** Faint wash over the forecast half, so "what happened" and "what's expected" read apart. */
function ForecastShade({ todayIndex }: { todayIndex: number }) {
  const { data, xScale, xAccessor, innerWidth, innerHeight } = useChartStable()
  const today = data[todayIndex]
  if (!today) return null
  const x = xScale(xAccessor(today)) ?? 0
  if (x >= innerWidth) return null
  return <rect x={x} y={0} width={Math.max(0, innerWidth - x)} height={innerHeight} fill="currentColor" className="text-foreground" fillOpacity={0.025} />
}

function momentValue(m: CashMoment, fmt: (base: number) => string): string {
  if (m.kind === "low_point") return fmt(m.amount)
  return `${m.amount >= 0 ? "+" : "−"}${fmt(Math.abs(m.amount))}`
}

function momentCompact(m: CashMoment, fmtCompact: (base: number) => string): string {
  if (m.kind === "low_point") return fmtCompact(m.amount)
  return `${m.amount >= 0 ? "+" : "−"}${fmtCompact(Math.abs(m.amount))}`
}

const MOMENT_DOT: Record<CashMoment["kind"], string> = {
  big_in: "fill-green-600 dark:fill-green-400",
  expected_in: "fill-green-600 dark:fill-green-400",
  big_out: "fill-muted-foreground",
  expected_out: "fill-muted-foreground",
  low_point: "fill-amber-500",
}

const MOMENT_SWATCH: Record<CashMoment["kind"], string> = {
  big_in: "bg-green-600 dark:bg-green-400",
  expected_in: "bg-green-600 dark:bg-green-400",
  big_out: "bg-muted-foreground",
  expected_out: "bg-muted-foreground",
  low_point: "bg-amber-500",
}

function shortTitle(title: string, max = 18): string {
  return title.length > max ? `${title.slice(0, max - 1).trimEnd()}…` : title
}

/** "Today" marker + moment dots and labels. Static — no motion. */
function CashStoryAnnotations({
  todayIndex,
  moments,
  fxRate,
  fmtCompact,
}: {
  todayIndex: number
  moments: CashMoment[]
  fxRate: number
  fmtCompact: (base: number) => string
}) {
  const { data, xScale, yScale, xAccessor, innerWidth, innerHeight } = useChartStable()
  const today = data[todayIndex]
  const byIso = new Map(data.map((d) => [d.iso as string, d]))
  const showLabels = innerWidth >= LABEL_MIN_WIDTH
  const todayX = today ? (xScale(xAccessor(today)) ?? null) : null

  return (
    <g pointerEvents="none" aria-hidden="true">
      {todayX != null && (
        <g>
          <line
            x1={todayX}
            x2={todayX}
            y1={-6}
            y2={innerHeight}
            stroke="var(--muted-foreground)"
            strokeOpacity={0.5}
            strokeDasharray="3,3"
          />
          <text
            x={todayX}
            y={-12}
            textAnchor={todayX > innerWidth - 24 ? "end" : "middle"}
            className="fill-muted-foreground text-[10px] font-medium"
          >
            Today
          </text>
        </g>
      )}

      {moments.map((m) => {
        const point = byIso.get(m.date)
        if (!point) return null
        const x = xScale(xAccessor(point)) ?? 0
        const y = yScale((point.balance as number) ?? m.amount * fxRate)
        const above = m.kind === "big_in" || m.kind === "expected_in"
        const labelY = Math.min(Math.max(above ? y - 12 : y + 20, 10), innerHeight - 4)
        const anchor = x < 110 ? "start" : x > innerWidth - 110 ? "end" : "middle"
        return (
          <g key={m.id}>
            <circle cx={x} cy={y} r={4.5} className="fill-background" />
            <circle cx={x} cy={y} r={3} className={MOMENT_DOT[m.kind]} />
            {showLabels && (
              <text
                x={x}
                y={labelY}
                textAnchor={anchor}
                className="fill-foreground/80 text-[10px]"
                stroke="var(--card)"
                strokeWidth={3}
                strokeLinejoin="round"
                paintOrder="stroke"
              >
                {shortTitle(m.title)} <tspan className="font-medium">{momentCompact(m, fmtCompact)}</tspan>
              </text>
            )}
          </g>
        )
      })}
    </g>
  )
}

/**
 * The same moments as a list — the only place they're readable on narrow
 * screens (labels are dropped there) and for screen readers (the chart SVG is
 * aria-hidden), so it's visually hidden from `sm` up.
 */
function MomentList({ moments, fmtCompact }: { moments: CashMoment[]; fmtCompact: (base: number) => string }) {
  return (
    <ul className="flex flex-col gap-1.5 sm:sr-only">
      {moments.map((m) => {
        const content = (
          <>
            <span className={cn("size-1.5 shrink-0 rounded-full", MOMENT_SWATCH[m.kind])} />
            <span className="w-12 shrink-0 text-muted-foreground tabular-nums">{format(parseISO(m.date), "d MMM")}</span>
            <span className="min-w-0 flex-1 truncate">{m.title}</span>
            <span className="shrink-0 font-medium tabular-nums">{momentCompact(m, fmtCompact)}</span>
          </>
        )
        return (
          <li key={m.id} className="text-xs">
            {m.href ? (
              <Link to={m.href} className="flex items-center gap-2 rounded-sm active:opacity-80">
                {content}
              </Link>
            ) : (
              <div className="flex items-center gap-2">{content}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

// ─── Summary + caveats ─────────────────────────────────────────────────────────

function Summary({ story, fmtCompact }: { story: CashStory; fmtCompact: (base: number) => string }) {
  const { lowest, lowestIsToday, expectedIn, expectedOut } = story.stats
  const net = story.mode === "net"

  const headlineLabel = lowestIsToday
    ? net
      ? "Net position stays above"
      : "Balance stays above"
    : `Lowest point · ${format(parseISO(lowest.date), "d MMM")}`
  const headlineTone = lowest.balance < 0 ? "text-destructive" : ""

  return (
    <div className="grid grid-cols-3 gap-3">
      <Stat label={headlineLabel} value={fmtCompact(lowest.balance)} className={headlineTone} />
      <Stat
        label="Expected in"
        value={expectedIn > 0 ? `+${fmtCompact(expectedIn)}` : fmtCompact(0)}
        className="text-green-600 dark:text-green-400"
      />
      <Stat label="Expected out" value={expectedOut > 0 ? `−${fmtCompact(expectedOut)}` : fmtCompact(0)} />
    </div>
  )
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p className={cn("truncate text-base font-semibold tracking-tight tabular-nums sm:text-lg", className)}>{value}</p>
    </div>
  )
}

function Caveats({ forecast }: { forecast: CashForecast }) {
  const notes: string[] = []
  const { foreignBills, unconvertibleInvoices, unconvertibleRecurring } = forecast.skipped
  if (foreignBills > 0) notes.push(`${foreignBills} foreign-currency bill${foreignBills === 1 ? "" : "s"} not included`)
  if (unconvertibleInvoices > 0)
    notes.push(`${unconvertibleInvoices} invoice${unconvertibleInvoices === 1 ? "" : "s"} without an exchange rate not included`)
  if (unconvertibleRecurring > 0)
    notes.push(
      `${unconvertibleRecurring} recurring expense${unconvertibleRecurring === 1 ? "" : "s"} in another currency not included`
    )

  return (
    <p className="text-[0.6875rem] text-muted-foreground">
      Expected invoices are placed on the day each customer usually pays
      {forecast.orgAvgDaysLate > 0 ? ` (on average ${forecast.orgAvgDaysLate} days after the due date)` : ""}.
      {notes.length > 0 && ` ${notes.join(" · ")}.`}
    </p>
  )
}
