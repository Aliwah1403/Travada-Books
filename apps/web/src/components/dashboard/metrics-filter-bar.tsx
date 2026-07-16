import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { format, formatISO, parseISO } from "date-fns"
import type { DateRange } from "react-day-picker"
import { Button } from "@travada-books/ui/components/button"
import { Calendar } from "@travada-books/ui/components/calendar"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@travada-books/ui/components/dropdown-menu"
import { Calendar01Icon, ArrowDown01Icon } from "@travada-books/ui/icons"
import { getInUseCurrencies, type RevenueType } from "@/lib/queries/metrics"
import {
  METRICS_RANGE_PRESETS,
  type MetricsRangePreset,
  type MetricsCustomRange,
} from "@/lib/metrics-range"

type MetricsFilterBarProps = {
  orgId: string
  baseCurrency: string
  range: MetricsRangePreset
  customRange?: MetricsCustomRange
  onRangeChange: (range: MetricsRangePreset, customRange?: MetricsCustomRange) => void
  revenueType: RevenueType
  onRevenueTypeChange: (revenueType: RevenueType) => void
  viewCurrency: string
  onViewCurrencyChange: (currency: string) => void
}

function periodLabel(range: MetricsRangePreset, customRange?: MetricsCustomRange) {
  if (range === "custom" && customRange) {
    return `${format(parseISO(customRange.from), "MMM d")} - ${format(parseISO(customRange.to), "MMM d, yyyy")}`
  }
  return METRICS_RANGE_PRESETS.find((preset) => preset.value === range)?.label ?? "Custom"
}

/**
 * Toolbar dropdown for the Metrics tab — bundles date range, revenue type,
 * and (when relevant) a view-currency override into a single control per the
 * "same dropdown, not separate controls" design decision.
 */
export function MetricsFilterBar({
  orgId,
  baseCurrency,
  range,
  customRange,
  onRangeChange,
  revenueType,
  onRevenueTypeChange,
  viewCurrency,
  onViewCurrencyChange,
}: MetricsFilterBarProps) {
  // Draft selection while the user is still dragging across the calendar —
  // only committed to URL state once both `from` and `to` are picked.
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(
    customRange ? { from: parseISO(customRange.from), to: parseISO(customRange.to) } : undefined
  )

  // Keep the calendar in sync with external changes to the URL-backed custom
  // range (e.g. browser back/forward), not just the initial mount value.
  useEffect(() => {
    setDraftRange(customRange ? { from: parseISO(customRange.from), to: parseISO(customRange.to) } : undefined)
  }, [customRange])

  const { data: inUseCurrencies } = useQuery({
    queryKey: ["in-use-currencies", orgId],
    queryFn: () => getInUseCurrencies(orgId, baseCurrency),
    staleTime: 5 * 60 * 1000,
  })

  const showCurrencySection = (inUseCurrencies?.length ?? 0) > 0

  const label = useMemo(() => periodLabel(range, customRange), [range, customRange])

  function handleCalendarSelect(next: DateRange | undefined) {
    setDraftRange(next)
    if (next?.from && next?.to) {
      onRangeChange("custom", {
        from: formatISO(next.from, { representation: "date" }),
        to: formatISO(next.to, { representation: "date" }),
      })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="gap-1.5 text-xs" />}>
        <Calendar01Icon className="size-3.5" />
        {label}
        <ArrowDown01Icon className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>PERIOD</DropdownMenuLabel>
          {METRICS_RANGE_PRESETS.filter((preset) => preset.value !== "custom").map((preset) => (
            <DropdownMenuCheckboxItem
              key={preset.value}
              checked={range === preset.value}
              onCheckedChange={() => onRangeChange(preset.value)}
            >
              {preset.label}
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {range === "custom" ? periodLabel("custom", customRange) : "Custom"}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-auto p-2">
              <Calendar
                mode="range"
                numberOfMonths={2}
                selected={draftRange}
                onSelect={handleCalendarSelect}
                disabled={(date) => date > new Date()}
              />
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>REVENUE TYPE</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={revenueType}
            onValueChange={(value) => onRevenueTypeChange(value as RevenueType)}
          >
            <DropdownMenuRadioItem value="gross">Gross Revenue (inc tax)</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="net">Net Revenue (ex tax)</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>

        {showCurrencySection && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>CURRENCY</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={viewCurrency} onValueChange={onViewCurrencyChange}>
                <DropdownMenuRadioItem value="base">Base currency ({baseCurrency})</DropdownMenuRadioItem>
                {inUseCurrencies?.map((currency) => (
                  <DropdownMenuRadioItem key={currency} value={currency}>
                    {currency}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
