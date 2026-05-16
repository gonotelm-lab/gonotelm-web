import { useEffect, useRef } from 'react'
import { pollSourceStatus } from '@/api/source'
import type { SourceCard } from '@/store/workspace'
import type { SourceStatus } from '@/types/api'

const terminalStatusSet = new Set<SourceStatus>(['ready', 'failed'])
const sourceStatusPollBaseIntervalMs = 1_000
const sourceStatusPollMaxIntervalMs = 10_000

const isTerminalStatus = (status?: SourceStatus) => !!status && terminalStatusSet.has(status)

interface UseSourcePollingOptions {
  notebookId: string
  sources: SourceCard[]
  removingSourceIds: Record<string, boolean>
  setSourceStatus: (id: string, status: SourceStatus) => void
}

export function useSourcePolling({
  notebookId,
  sources,
  removingSourceIds,
  setSourceStatus,
}: UseSourcePollingOptions) {
  const sourcesRef = useRef(sources)
  const removingSourceIdsRef = useRef(removingSourceIds)

  useEffect(() => {
    sourcesRef.current = sources
  }, [sources])

  useEffect(() => {
    removingSourceIdsRef.current = removingSourceIds
  }, [removingSourceIds])

  useEffect(() => {
    if (!notebookId) return

    let cancelled = false
    let timeoutId: number | null = null
    let attempt = 0

    const scheduleNext = () => {
      if (cancelled) return
      const delay = Math.min(
        sourceStatusPollBaseIntervalMs * Math.pow(2, attempt),
        sourceStatusPollMaxIntervalMs,
      )
      timeoutId = window.setTimeout(() => {
        void tick()
      }, delay)
    }

    const tick = async () => {
      if (cancelled) return

      const pendingSources = sourcesRef.current.filter(
        (source) =>
          !isTerminalStatus(source.status) &&
          !removingSourceIdsRef.current[source.id],
      )
      if (pendingSources.length === 0) {
        attempt = 0
        scheduleNext()
        return
      }

      await Promise.all(
        pendingSources.map(async (source) => {
          try {
            const status = await pollSourceStatus(source.id)
            if (!cancelled) {
              setSourceStatus(source.id, status.status)
            }
          } catch (error) {
            // keep silent for polling loop to avoid noisy snackbars
            console.warn('poll source status failed', source.id, error)
          }
        }),
      )
      attempt += 1
      scheduleNext()
    }

    void tick()

    return () => {
      cancelled = true
      if (timeoutId != null) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [notebookId, setSourceStatus])
}
