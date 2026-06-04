import { useEffect, useRef } from 'react'

interface UseAdaptivePollingLoopOptions {
  enabled: boolean
  restartKey?: unknown
  baseIntervalMs: number
  maxIntervalMs: number
  tick: () => Promise<boolean> | boolean
}

export function useAdaptivePollingLoop({
  enabled,
  restartKey,
  baseIntervalMs,
  maxIntervalMs,
  tick,
}: UseAdaptivePollingLoopOptions) {
  const tickRef = useRef(tick)

  useEffect(() => {
    tickRef.current = tick
  }, [tick])

  useEffect(() => {
    if (!enabled) {
      return
    }

    let cancelled = false
    let timeoutId: number | null = null
    let attempt = 0

    const scheduleNext = () => {
      if (cancelled) {
        return
      }
      const delay = Math.min(
        baseIntervalMs * Math.pow(2, attempt),
        maxIntervalMs,
      )
      timeoutId = window.setTimeout(() => {
        void runTick()
      }, delay)
    }

    const runTick = async () => {
      if (cancelled) {
        return
      }

      try {
        const hasActiveWork = await tickRef.current()
        attempt = hasActiveWork ? attempt + 1 : 0
      } catch {
        // Polling loop never throws to UI layer.
        attempt += 1
      }
      scheduleNext()
    }

    void runTick()

    return () => {
      cancelled = true
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [baseIntervalMs, enabled, maxIntervalMs, restartKey])
}
