import {
  differenceInCalendarDays,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns"

const ISO_DATE = "yyyy-MM-dd"

export type MetricsRangePreset = "1m" | "3m" | "6m" | "12m" | "24m" | "60m" | "ytd" | "custom"

export const DEFAULT_METRICS_RANGE: MetricsRangePreset = "12m"

export const METRICS_RANGE_PRESETS: { value: MetricsRangePreset; label: string }[] = [
  { value: "1m", label: "This month" },
  { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" },
  { value: "ytd", label: "Year to date" },
  { value: "12m", label: "Last 1 year" },
  { value: "24m", label: "Last 2 years" },
  { value: "60m", label: "Last 5 years" },
  { value: "custom", label: "Custom" },
]

const PRESET_VALUES = new Set<MetricsRangePreset>([
  "1m",
  "3m",
  "6m",
  "12m",
  "24m",
  "60m",
  "ytd",
  "custom",
])

export function isMetricsRangePreset(value: string | null): value is MetricsRangePreset {
  return value !== null && PRESET_VALUES.has(value as MetricsRangePreset)
}

export type MetricsCustomRange = { from: string; to: string }

/**
 * Resolves a preset to inclusive `from`/`to` ISO date strings (`YYYY-MM-DD`).
 * `custom` requires `customRange` — if it's missing (e.g. stale URL state),
 * this falls through to the default 12-month window rather than throwing.
 */
export function resolveMetricsRange(
  preset: MetricsRangePreset,
  now: Date = new Date(),
  customRange?: MetricsCustomRange
): { from: string; to: string } {
  const to = format(endOfMonth(now), ISO_DATE)

  switch (preset) {
    case "1m":
      return { from: format(startOfMonth(now), ISO_DATE), to }
    case "3m":
      return { from: format(startOfMonth(subMonths(now, 2)), ISO_DATE), to }
    case "6m":
      return { from: format(startOfMonth(subMonths(now, 5)), ISO_DATE), to }
    case "ytd":
      return { from: format(startOfYear(now), ISO_DATE), to }
    case "24m":
      return { from: format(startOfMonth(subMonths(now, 23)), ISO_DATE), to }
    case "60m":
      return { from: format(startOfMonth(subMonths(now, 59)), ISO_DATE), to }
    case "custom":
      if (customRange) return customRange
      return { from: format(startOfMonth(subMonths(now, 11)), ISO_DATE), to }
    default:
      return { from: format(startOfMonth(subMonths(now, 11)), ISO_DATE), to }
  }
}

/**
 * Resolves the previous period immediately preceding `[from, to]` (inclusive),
 * with the same number of days, ending the day before `from`.
 *
 * E.g. `from=2026-06-01, to=2026-08-31` (92 days) resolves to the 92 days
 * ending 2026-05-31, i.e. `from=2026-03-01, to=2026-05-31`.
 */
export function resolvePreviousPeriod(from: string, to: string): MetricsCustomRange {
  const fromDate = parseISO(from)
  const toDate = parseISO(to)
  const lengthInDays = differenceInCalendarDays(toDate, fromDate) + 1

  const prevTo = subDays(fromDate, 1)
  const prevFrom = subDays(prevTo, lengthInDays - 1)

  return { from: format(prevFrom, ISO_DATE), to: format(prevTo, ISO_DATE) }
}
