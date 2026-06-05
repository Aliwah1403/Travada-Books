import { format } from "date-fns"
import { TZDate } from "@date-fns/tz"

const DATE_FORMAT_MAP: Record<string, string> = {
  "DD/MM/YYYY": "dd/MM/yyyy",
  "MM/DD/YYYY": "MM/dd/yyyy",
  "YYYY-MM-DD": "yyyy-MM-dd",
}

export function makeDateFormatters(
  dateFormat: string,
  timeFormat: string,
  timezone: string,
) {
  const dateFmt = DATE_FORMAT_MAP[dateFormat] ?? "dd/MM/yyyy"
  const timeFmt = timeFormat === "12h" ? "h:mm a" : "HH:mm"
  const tz = timezone || "UTC"

  function toZoned(value: string | Date): TZDate {
    const d = typeof value === "string" ? new Date(value) : value
    try {
      return new TZDate(d, tz)
    } catch {
      return new TZDate(d, "UTC")
    }
  }

  return {
    formatDate(value: string | Date | null | undefined): string {
      if (!value) return "—"
      try {
        return format(toZoned(value), dateFmt)
      } catch {
        return String(value)
      }
    },
    formatDateTime(value: string | Date | null | undefined): string {
      if (!value) return "—"
      try {
        return format(toZoned(value), `${dateFmt}, ${timeFmt}`)
      } catch {
        return String(value)
      }
    },
    formatMonthDay(value: string | Date | null | undefined): string {
      if (!value) return "—"
      try {
        return format(toZoned(value), "dd MMM yyyy")
      } catch {
        return String(value)
      }
    },
  }
}
