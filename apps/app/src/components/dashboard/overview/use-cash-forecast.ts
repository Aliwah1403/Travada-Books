import { useQuery } from "@tanstack/react-query"
import { FORECAST_STALE_TIME, forecastQueryKey, getCashForecast } from "@/lib/queries/forecast"

/**
 * Shared by the briefing strip and the cash calendar — same key, so the
 * forecast is fetched once for the whole Overview tab.
 * `baseCurrency` is the org's base currency (forecast math stays in base).
 */
export function useCashForecast(orgId: string, baseCurrency: string) {
  return useQuery({
    queryKey: forecastQueryKey(orgId),
    queryFn: () => getCashForecast(orgId, baseCurrency),
    staleTime: FORECAST_STALE_TIME,
  })
}
