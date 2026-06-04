import { useCallback, useEffect, useRef } from 'react'
import { pollSourceStatus } from '@/api/source'
import type { SourceCard } from '@/store/workspace'
import type { SourceStatus } from '@/types/api'
import { useAdaptivePollingLoop } from './useAdaptivePollingLoop'

const terminalStatusSet = new Set<SourceStatus>(['ready', 'failed'])
const sourceStatusPollBaseIntervalMs = 1_000
const sourceStatusPollMaxIntervalMs = 10_000

const isTerminalStatus = (status?: SourceStatus) => !!status && terminalStatusSet.has(status)

interface UseSourcePollingOptions {
  notebookId: string
  sources: SourceCard[]
  removingSourceIds: Record<string, boolean>
  setSourceStatus: (id: string, status: SourceStatus) => void
  onSourceReady?: () => void
}

export function useSourcePolling({
  notebookId,
  sources,
  removingSourceIds,
  setSourceStatus,
  onSourceReady,
}: UseSourcePollingOptions) {
  const sourcesRef = useRef(sources)
  const removingSourceIdsRef = useRef(removingSourceIds)
  const setSourceStatusRef = useRef(setSourceStatus)
  const onSourceReadyRef = useRef(onSourceReady)

  useEffect(() => {
    sourcesRef.current = sources
  }, [sources])

  useEffect(() => {
    removingSourceIdsRef.current = removingSourceIds
  }, [removingSourceIds])

  useEffect(() => {
    setSourceStatusRef.current = setSourceStatus
  }, [setSourceStatus])

  useEffect(() => {
    onSourceReadyRef.current = onSourceReady
  }, [onSourceReady])

  const pollSourceTick = useCallback(async () => {
    const pendingSources = sourcesRef.current.filter(
      (source) =>
        !isTerminalStatus(source.status) &&
        !removingSourceIdsRef.current[source.id],
    )
    if (pendingSources.length === 0) {
      return false
    }

    let hasSourceReady = false

    await Promise.all(
      pendingSources.map(async (source) => {
        try {
          const status = await pollSourceStatus(source.id)
          if (source.status !== 'ready' && status.status === 'ready') {
            hasSourceReady = true
          }
          setSourceStatusRef.current(source.id, status.status)
        } catch (error) {
          // keep silent for polling loop to avoid noisy snackbars
          console.warn('poll source status failed', source.id, error)
        }
      }),
    )
    if (hasSourceReady) {
      onSourceReadyRef.current?.()
    }
    return true
  }, [])

  useAdaptivePollingLoop({
    enabled: Boolean(notebookId),
    restartKey: notebookId,
    baseIntervalMs: sourceStatusPollBaseIntervalMs,
    maxIntervalMs: sourceStatusPollMaxIntervalMs,
    tick: pollSourceTick,
  })
}
