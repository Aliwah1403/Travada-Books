import { useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { makeDateFormatters } from "@/lib/format-date"

export function useFormatDate() {
  const { profile } = useAuth()

  return useMemo(() => {
    const effectiveTimezone =
      profile?.timezone_auto_sync
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : (profile?.timezone ?? "UTC")

    return makeDateFormatters(
      profile?.date_format ?? "DD/MM/YYYY",
      profile?.time_format ?? "24h",
      effectiveTimezone,
    )
  }, [profile?.date_format, profile?.time_format, profile?.timezone, profile?.timezone_auto_sync])
}
