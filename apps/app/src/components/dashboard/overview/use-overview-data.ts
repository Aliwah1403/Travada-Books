import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { FORECAST_STALE_TIME } from "@/lib/queries/forecast"
import { cashHistoryQueryKey, computeCashStory, getCashHistoryInput, type CashStory } from "@/lib/queries/cash-story"
import { getOverviewIncome, overviewIncomeQueryKey } from "@/lib/queries/overview-story"
import { useCashForecast } from "./use-cash-forecast"

/**
 * Money in for the selected range (+ the stretch before it), shared by the
 * story headline, the "what moves it" strip and the insights carousel.
 */
export function useOverviewIncome(orgId: string, from: string, to: string, today: string) {
  return useQuery({
    queryKey: overviewIncomeQueryKey(orgId, from, to, today),
    queryFn: () => getOverviewIncome(orgId, from, to, today),
    staleTime: FORECAST_STALE_TIME,
  })
}

/**
 * Actual balance history joined to the forecast (lib/queries/cash-story.ts).
 * `data` is null until both halves have loaded.
 */
export function useCashStory(orgId: string, baseCurrency: string) {
  const forecastQuery = useCashForecast(orgId, baseCurrency)
  const today = forecastQuery.data?.today
  const historyQuery = useQuery({
    queryKey: cashHistoryQueryKey(orgId, today ?? ""),
    queryFn: () => getCashHistoryInput(orgId, today!),
    enabled: today != null,
    staleTime: FORECAST_STALE_TIME,
  })

  const data = useMemo<CashStory | null>(
    () => (forecastQuery.data && historyQuery.data ? computeCashStory(historyQuery.data, forecastQuery.data) : null),
    [forecastQuery.data, historyQuery.data]
  )

  return {
    data,
    forecast: forecastQuery.data ?? null,
    isLoading: forecastQuery.isLoading || (today != null && historyQuery.isLoading),
    isError: forecastQuery.isError || historyQuery.isError,
    refetch: () => {
      forecastQuery.refetch()
      historyQuery.refetch()
    },
  }
}
