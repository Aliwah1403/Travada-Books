import { format } from "date-fns"
import { TZDate } from "@date-fns/tz"

// Legacy remap: old moment-style strings stored in DB before the migration
const LEGACY_FORMAT_MAP: Record<string, string> = {
  "DD/MM/YYYY": "dd/MM/yyyy",
  "MM/DD/YYYY": "MM/dd/yyyy",
  "YYYY-MM-DD": "yyyy-MM-dd",
  "D MMM YYYY": "d MMM yyyy",
}

export function makeDateFormatters(
  dateFormat: string,
  timeFormat: string,
  timezone: string,
) {
  const dateFmt = LEGACY_FORMAT_MAP[dateFormat] ?? dateFormat ?? "dd/MM/yyyy"
  const timeFmt = timeFormat === "12h" ? "h:mm a" : "HH:mm"
  const tz = timezone || "UTC"

  function toZoned(value: string | Date): TZDate {
    let d: Date
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split("-").map(Number)
      d = new Date(year, month - 1, day)
    } else {
      d = typeof value === "string" ? new Date(value) : value
    }
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
    // Compact format for activity timelines: "5 Jun, 2:30 PM" or "5 Jun, 14:30"
    formatActivityDate(value: string | Date | null | undefined): string {
      if (!value) return "—"
      try {
        return format(toZoned(value), `d MMM, ${timeFmt}`)
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
