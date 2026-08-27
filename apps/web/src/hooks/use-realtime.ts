import { useCallback, useEffect, useRef } from "react"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

type EventType = "INSERT" | "UPDATE" | "DELETE"

interface UseRealtimeProps {
  channelName: string
  events?: EventType[]
  table: string
  filter?: string
  onEvent: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
}

// Port of Midday's useRealtime hook (github.com/midday-ai/midday), adapted to
// use our existing supabase singleton (@/lib/supabase) instead of a lazy-init
// wrapper. Every behaviour below exists for a specific reason — see the
// inline notes before changing any of it.
export function useRealtime({ channelName, events = ["INSERT", "UPDATE"], table, filter, onEvent }: UseRealtimeProps) {
  // Keep the latest onEvent in a ref, updated by its own effect, so changing
  // the callback identity never re-subscribes the channel below.
  const onEventRef = useRef(onEvent)
  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  useEffect(() => {
    // Bail out before subscribing if the filter isn't ready yet (e.g. orgId
    // hasn't loaded) — subscribing without it would scope to every row.
    if (!filter) return

    // Random suffix so React StrictMode's double-invoke in dev doesn't try to
    // subscribe the same channel name twice and collide.
    const uniqueChannelName = `${channelName}:${Math.random().toString(36).slice(2, 8)}`
    let channel = supabase.channel(uniqueChannelName)

    // Register a separate listener per event type — Supabase realtime has
    // issues when subscribing with event: "*", so never do that here.
    for (const event of events) {
      // The overload for `event` only accepts one literal member of
      // REALTIME_POSTGRES_CHANGES_LISTEN_EVENT at a time, but we're iterating
      // a union — cast is unavoidable here, same as Midday's implementation.
      channel = channel.on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        { event, schema: "public", table, filter },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          onEventRef.current(payload)
        },
      )
    }

    channel.subscribe((status, err) => {
      if (status === "CHANNEL_ERROR") {
        console.error(`[realtime] channel error on ${uniqueChannelName}:`, err)
      }
      if (status === "TIMED_OUT") {
        console.error(`[realtime] channel timed out on ${uniqueChannelName}`)
      }
    })

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, table, filter])
}

// Small debounce helper for call sites that need to coalesce bursts of
// realtime events (e.g. a CSV import inserting hundreds of rows) into a
// single refetch/invalidate instead of one per row.
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
): (...args: Args) => void {
  const callbackRef = useRef(callback)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return useCallback(
    (...args: Args) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => callbackRef.current(...args), delayMs)
    },
    [delayMs],
  )
}
