import { Navigate, useSearchParams } from "react-router"
import { INSIGHT_PARAM, LATEST_INSIGHT } from "@/components/dashboard/overview/weekly-summary-sheet"

/**
 * /insights used to be its own page; the weekly summaries now open in a sheet
 * on the Overview. Kept as a redirect because every weekly email already sent
 * links here (with ?from=weekly-insight, which the sheet counts and drops).
 */
export function InsightsRedirect() {
  const [searchParams] = useSearchParams()
  const next = new URLSearchParams(searchParams)
  if (!next.get(INSIGHT_PARAM)) next.set(INSIGHT_PARAM, LATEST_INSIGHT)
  return <Navigate to={`/?${next.toString()}`} replace />
}
