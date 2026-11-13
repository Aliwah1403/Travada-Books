import { useQuery } from "@tanstack/react-query"
import { FORECAST_STALE_TIME, forecastQueryKey, getCashForecast } from "@/lib/queries/forecast"

/**
 * Shared by every Overview block that reads the forecast (story headline,
 * cash story chart, "what moves it", insights) — same key, so it's fetched
 * once for the whole tab. `baseCurrency` is the org's base currency (forecast
 * math stays in base).
 */
export function useCashForecast(orgId: string, baseCurrency: string) {
  return useQuery({
    queryKey: forecastQueryKey(orgId),
    queryFn: () => getCashForecast(orgId, baseCurrency),
    staleTime: FORECAST_STALE_TIME,
  })
}
