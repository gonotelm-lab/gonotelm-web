import { useCallback, useRef } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { MessageStreamPhaseType } from '@/types/api'
import { streamStatusMinVisibleMs } from './chatConversationCommon'

interface UseStreamStatusSchedulerParams {
  setStreamPhaseType: Dispatch<SetStateAction<MessageStreamPhaseType | null>>
  setStreamStatus: Dispatch<SetStateAction<string>>
}

interface UseStreamStatusSchedulerResult {
  clearStreamStatusSchedule: () => void
  applyStreamStatusImmediately: (phase: MessageStreamPhaseType | null, text: string) => void
  queueStreamStatus: (phase: MessageStreamPhaseType, text: string) => void
  resetLastStreamStatusAt: () => void
}

export function useStreamStatusScheduler({
  setStreamPhaseType,
  setStreamStatus,
}: UseStreamStatusSchedulerParams): UseStreamStatusSchedulerResult {
  const streamStatusSwitchTimerRef = useRef<number | null>(null)
  const pendingStreamStatusRef = useRef<{ phase: MessageStreamPhaseType; text: string } | null>(null)
  const lastStreamStatusAtRef = useRef(0)

  const clearStreamStatusSchedule = useCallback(() => {
    if (streamStatusSwitchTimerRef.current !== null) {
      window.clearTimeout(streamStatusSwitchTimerRef.current)
      streamStatusSwitchTimerRef.current = null
    }
    pendingStreamStatusRef.current = null
  }, [])

  const applyStreamStatusImmediately = useCallback(
    (phase: MessageStreamPhaseType | null, text: string) => {
      setStreamPhaseType(phase)
      setStreamStatus(text)
      lastStreamStatusAtRef.current = performance.now()
    },
    [setStreamPhaseType, setStreamStatus],
  )

  const queueStreamStatus = useCallback(
    (phase: MessageStreamPhaseType, text: string) => {
      const now = performance.now()
      const elapsed = now - lastStreamStatusAtRef.current
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
