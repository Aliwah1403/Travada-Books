import { useMemo } from "react"
import { Link } from "react-router"
import { format, parseISO } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@travada-books/ui/components/card"
import { Skeleton } from "@travada-books/ui/components/skeleton"
import { Calendar01Icon, Invoice01Icon, ReceiptTextIcon, RepeatIcon, type Icon } from "@travada-books/ui/icons"
import { cn } from "@travada-books/ui/lib/utils"
import { AreaChart } from "@/components/charts/area-chart"
import { AreaChartLoading } from "@/components/charts/area-chart-loading"
import { Area } from "@/components/charts/area"
import { Grid } from "@/components/charts/grid"
import { XAxis } from "@/components/charts/x-axis"
import { YAxis } from "@/components/charts/y-axis"
import { ChartTooltip } from "@/components/charts/tooltip"
import { chartCssVars } from "@/components/charts/chart-context"
import { ChartCardError } from "@/components/dashboard/chart-card"
import { useIsMobile } from "@/hooks/use-mobile"
import { formatCurrency, formatCurrencyCompact } from "@/lib/format"
import type { CashForecast, ForecastEvent, ForecastEventKind } from "@/lib/queries/forecast"
import { useCashForecast } from "./use-cash-forecast"

const MARGIN = { top: 24, right: 16, bottom: 32, left: 56 }
const UPCOMING_COUNT = 6
const TITLE = "Cash calendar"

const KIND_ICON: Record<ForecastEventKind, Icon> = {
  invoice: Invoice01Icon,
  bill: ReceiptTextIcon,
  recurring_expense: RepeatIcon,
}

type CashCalendarProps = {
  orgId: string
  /** Org base currency — the forecast is computed in it. */
  currency: string
  displayCurrency: string
  fxRate: number
}

export function CashCalendar({ orgId, currency, displayCurrency, fxRate }: CashCalendarProps) {
  const { data, isLoading, isError, refetch } = useCashForecast(orgId, currency)
  const isMobile = useIsMobile()
  const aspectRatio = isMobile ? "3 / 2" : "5 / 2"

  const chartData = useMemo(
    () =>
      (data?.days ?? []).map((d) => ({
        date: parseISO(d.date),
        balance: d.balance * fxRate,
        inflow: d.inflow * fxRate,
        outflow: d.outflow * fxRate,
      })),
    [data, fxRate]
  )

  if (isError) {
    return (
      <div id="cash-calendar" className="scroll-mt-6">
        <ChartCardError title={TITLE} icon={Calendar01Icon} onRetry={() => refetch()} />
      </div>
    )
  }

  const fmt = (base: number) => formatCurrency(base * fxRate, displayCurrency)
  const fmtCompact = (base: number) => formatCurrencyCompact(base * fxRate, displayCurrency)

  return (
    <Card id="cash-calendar" className="w-full scroll-mt-6">
      <CardHeader className="flex flex-row items-start gap-2 space-y-0">
        <Calendar01Icon size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
        <div className="flex flex-col gap-1">
          <CardTitle>{TITLE}</CardTitle>
          <CardDescription>
            {data && !data.isConfigured ? (
              <>
                Net position over the next {data.horizonDays} days.{" "}
                <Link
                  to="/settings/general"
                  className="font-medium text-primary underline-offset-4 fine-hover:underline"
                >
                  Set an opening balance
                </Link>{" "}
                to see your real cash.
              </>
            ) : (
              `Projected balance over the next ${data?.horizonDays ?? 60} days, from open invoices, bills and recurring expenses`
            )}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {isLoading || !data ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <AreaChartLoading aspectRatio={aspectRatio} margin={MARGIN} />
              <div className="flex flex-col gap-2">
                {Array.from({ length: UPCOMING_COUNT }, (_, i) => (
                  <div key={i} className="h-10 w-full animate-pulse rounded-md bg-muted" />
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <Summary forecast={data} fmtCompact={fmtCompact} />

            <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="min-w-0">
                <AreaChart data={chartData} xDataKey="date" aspectRatio={aspectRatio} margin={MARGIN} fitYDomain>
                  <Grid horizontal highlightRowValues={[0]} />
                  <Area
                    dataKey="balance"
                    fill={chartCssVars.linePrimary}
                    stroke={chartCssVars.linePrimary}
                    strokeWidth={2.5}
                    fillOpacity={0.15}
                  />
                  <XAxis numTicks={isMobile ? 3 : 6} />
                  <YAxis formatValue={(v) => formatCurrencyCompact(v, displayCurrency)} />
                  <ChartTooltip
                    rows={(point) => {
                      const rows = [
                        {
                          color: chartCssVars.linePrimary,
                          label: data.isConfigured ? "Balance" : "Net position",
                          value: formatCurrency((point.balance as number) ?? 0, displayCurrency),
                        },
                      ]
                      const inflow = (point.inflow as number) ?? 0
                      const outflow = (point.outflow as number) ?? 0
                      if (inflow > 0)
                        rows.push({ color: "var(--chart-2)", label: "Money in", value: formatCurrency(inflow, displayCurrency) })
                      if (outflow > 0)
                        rows.push({ color: "var(--chart-5)", label: "Money out", value: formatCurrency(outflow, displayCurrency) })
                      return rows
                    }}
                  />
                </AreaChart>
              </div>

              <UpcomingList forecast={data} fmt={fmt} />
            </div>

            <Caveats forecast={data} />
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Pieces ────────────────────────────────────────────────────────────────────

function Summary({ forecast, fmtCompact }: { forecast: CashForecast; fmtCompact: (base: number) => string }) {
  const { lowest, startBalance, isConfigured, totals } = forecast
  const lowestIsToday = lowest.date === forecast.today && lowest.balance >= startBalance

  let headlineLabel: string
  let headlineValue: string
  let headlineTone = ""
  if (lowestIsToday) {
    headlineLabel = isConfigured ? "Balance stays above" : "Net position stays above"
    headlineValue = fmtCompact(lowest.balance)
  } else {
    headlineLabel = `Lowest point · ${format(parseISO(lowest.date), "d MMM")}`
    headlineValue = fmtCompact(lowest.balance)
    if (lowest.balance < 0) headlineTone = "text-destructive"
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      <Stat label={headlineLabel} value={headlineValue} className={headlineTone} />
      <Stat label="Expected in" value={totals.inflow > 0 ? `+${fmtCompact(totals.inflow)}` : fmtCompact(0)} className="text-green-600 dark:text-green-400" />
      <Stat label="Expected out" value={totals.outflow > 0 ? `−${fmtCompact(totals.outflow)}` : fmtCompact(0)} />
    </div>
  )
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p className={cn("truncate text-lg font-semibold tracking-tight sm:text-xl", className)}>{value}</p>
    </div>
  )
}

function UpcomingList({ forecast, fmt }: { forecast: CashForecast; fmt: (base: number) => string }) {
  const upcoming = forecast.events.slice(0, UPCOMING_COUNT)

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="px-2 text-xs font-medium text-muted-foreground">Coming up</p>
      {upcoming.length === 0 ? (
        <p className="px-2 py-3 text-xs text-muted-foreground">
          Nothing scheduled in the next {forecast.horizonDays} days.
        </p>
      ) : (
        <ul className="flex flex-col">
          {upcoming.map((event) => (
            <UpcomingRow key={event.id} event={event} fmt={fmt} />
          ))}
        </ul>
      )}
    </div>
  )
}

function eventSubtitle(event: ForecastEvent): string {
  const when = format(parseISO(event.date), "EEE d MMM")
  switch (event.kind) {
    case "invoice":
      if (event.overdue) return `Overdue · expected ${when}`
      return event.dueDate && event.dueDate !== event.date ? `Expected ${when} · due ${format(parseISO(event.dueDate), "d MMM")}` : `Due ${when}`
    case "bill":
      return event.overdue ? "Past due · owed now" : `Bill due ${when}`
    case "recurring_expense":
      return `Recurring · ${when}`
  }
}

function UpcomingRow({ event, fmt }: { event: ForecastEvent; fmt: (base: number) => string }) {
  const KindIcon = KIND_ICON[event.kind]
  const isIn = event.direction === "in"
  return (
    <li>
      <Link
        to={event.href}
        className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors fine-hover:bg-muted active:opacity-80"
      >
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
          <KindIcon size={14} className="text-muted-foreground" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-xs font-medium">
            {event.label}
            {event.reference && <span className="font-normal text-muted-foreground"> · {event.reference}</span>}
          </span>
          <span className={cn("truncate text-[0.6875rem] text-muted-foreground", event.overdue && "text-destructive")}>
            {eventSubtitle(event)}
          </span>
        </div>
        <span
          className={cn(
            "shrink-0 text-xs font-medium tabular-nums",
            isIn ? "text-green-600 dark:text-green-400" : "text-foreground"
          )}
        >
          {isIn ? "+" : "−"}
          {fmt(event.amount)}
        </span>
      </Link>
    </li>
  )
}

function Caveats({ forecast }: { forecast: CashForecast }) {
  const notes: string[] = []
  const { foreignBills, unconvertibleInvoices, unconvertibleRecurring } = forecast.skipped
  if (foreignBills > 0)
    notes.push(`${foreignBills} foreign-currency bill${foreignBills === 1 ? "" : "s"} not included`)
  if (unconvertibleInvoices > 0)
    notes.push(`${unconvertibleInvoices} invoice${unconvertibleInvoices === 1 ? "" : "s"} without an exchange rate not included`)
  if (unconvertibleRecurring > 0)
    notes.push(`${unconvertibleRecurring} recurring expense${unconvertibleRecurring === 1 ? "" : "s"} in another currency not included`)

  return (
    <p className="text-[0.6875rem] text-muted-foreground">
      Invoices are placed on the day each customer usually pays
      {forecast.orgAvgDaysLate > 0 ? ` (on average ${forecast.orgAvgDaysLate} days after the due date)` : ""}.
      {notes.length > 0 && ` ${notes.join(" · ")}.`}
    </p>
  )
}
