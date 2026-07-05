import { useCallback, useRef } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { StreamDisplayPhaseType } from './chatConversationCommon'
import { streamStatusMinVisibleMs } from './chatConversationCommon'

interface UseStreamStatusSchedulerParams {
  setStreamPhaseType: Dispatch<SetStateAction<StreamDisplayPhaseType>>
  setStreamStatus: Dispatch<SetStateAction<string>>
}

interface UseStreamStatusSchedulerResult {
  clearStreamStatusSchedule: () => void
  applyStreamStatusImmediately: (phase: StreamDisplayPhaseType, text: string) => void
  queueStreamStatus: (phase: StreamDisplayPhaseType, text: string) => void
  resetLastStreamStatusAt: () => void
}

/**
 * Schedules stream status updates with a minimum visible duration.
 * This prevents rapid phase transitions from flickering status text
 * while still applying the latest pending phase as soon as allowed.
 */
export function useStreamStatusScheduler({
  setStreamPhaseType,
  setStreamStatus,
}: UseStreamStatusSchedulerParams): UseStreamStatusSchedulerResult {
  const streamStatusSwitchTimerRef = useRef<number | null>(null)
  // Keep only the latest pending status so rapid phase updates collapse instead of flickering in sequence.
  const pendingStreamStatusRef = useRef<{ phase: StreamDisplayPhaseType; text: string } | null>(null)
  const lastStreamStatusAtRef = useRef(0)

  const clearStreamStatusSchedule = useCallback(() => {
    if (streamStatusSwitchTimerRef.current !== null) {
      window.clearTimeout(streamStatusSwitchTimerRef.current)
      streamStatusSwitchTimerRef.current = null
    }
    pendingStreamStatusRef.current = null
  }, [])

  const applyStreamStatusImmediately = useCallback(
    (phase: StreamDisplayPhaseType, text: string) => {
      setStreamPhaseType(phase)
      setStreamStatus(text)
      lastStreamStatusAtRef.current = performance.now()
    },
    [setStreamPhaseType, setStreamStatus],
  )

  /**
   * Applies stream status now or queues it for delayed switch,
   * depending on whether the current status has been visible long enough.
   */
  const queueStreamStatus = useCallback(
    (phase: StreamDisplayPhaseType, text: string) => {
      const now = performance.now()
      const elapsed = now - lastStreamStatusAtRef.current
      // Enforce a minimum visible window so status text does not flash too quickly.
      const canApplyNow =
        lastStreamStatusAtRef.current === 0 ||
        elapsed >= streamStatusMinVisibleMs

      if (canApplyNow && streamStatusSwitchTimerRef.current === null) {
        applyStreamStatusImmediately(phase, text)
        return
      }

      pendingStreamStatusRef.current = { phase, text }
      if (streamStatusSwitchTimerRef.current !== null) {
        return
      }

      // Delay switch just enough to satisfy min-visible constraint, then apply latest pending state.
      const waitMs = Math.max(streamStatusMinVisibleMs - elapsed, 0)
      streamStatusSwitchTimerRef.current = window.setTimeout(() => {
        streamStatusSwitchTimerRef.current = null
        const pending = pendingStreamStatusRef.current
        pendingStreamStatusRef.current = null
        if (!pending) return
        applyStreamStatusImmediately(pending.phase, pending.text)
      }, waitMs)
    },
    [applyStreamStatusImmediately],
  )

  const resetLastStreamStatusAt = useCallback(() => {
    lastStreamStatusAtRef.current = 0
  }, [])

  return {
    clearStreamStatusSchedule,
    applyStreamStatusImmediately,
    queueStreamStatus,
    resetLastStreamStatusAt,
  }
}
