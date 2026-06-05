import { useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { makeDateFormatters } from "@/lib/format-date"

export function useFormatDate() {
  const { profile } = useAuth()

  return useMemo(
    () =>
      makeDateFormatters(
        profile?.date_format ?? "DD/MM/YYYY",
        profile?.time_format ?? "24h",
        profile?.timezone ?? "UTC",
      ),
    [profile?.date_format, profile?.time_format, profile?.timezone],
  )
}
