import { useCallback, useRef } from 'react'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import { mergeDistinctCitationDetails, streamAutoScrollThresholdPx, streamChunkFlushIntervalMs, streamChunkImmediateFlushSize } from './chatConversationCommon'
import type { ChatUiCitationDetail, ChatUiMessage } from './types'

interface UseAssistantChunkBufferParams {
  messageListRef: RefObject<HTMLDivElement | null>
  setLiveMessages: Dispatch<SetStateAction<ChatUiMessage[]>>
}

interface UseAssistantChunkBufferResult {
  clearPendingAssistantChunkBuffer: () => void
  queueAssistantChunk: (assistantMessageId: string, chunk: string) => void
  flushPendingAssistantChunk: () => void
  overrideAssistantContent: (assistantMessageId: string, content: string) => void
  applyAssistantCitationDetails: (
    assistantMessageId: string,
    citationDetails: ChatUiCitationDetail[],
  ) => void
}

/**
 * Buffers incremental assistant stream chunks before committing to React state.
 * This reduces render churn, preserves near-bottom auto-scroll behavior,
 * and merges citation updates without duplicating markers.
 */
export function useAssistantChunkBuffer({
  messageListRef,
  setLiveMessages,
}: UseAssistantChunkBufferParams): UseAssistantChunkBufferResult {
  // Buffer chunks to reduce rerender frequency while preserving streaming responsiveness.
  const pendingAssistantChunkRef = useRef('')
  const pendingAssistantChunkMessageIdRef = useRef<string | null>(null)
  const pendingAssistantChunkFlushTimerRef = useRef<number | null>(null)

  const appendAssistantChunk = useCallback(
    (assistantMessageId: string, contentChunk: string) => {
      const container = messageListRef.current
      // Only auto-stick when user is already near bottom; avoid hijacking manual scroll review.
      const shouldStickToBottom = Boolean(
        container &&
          container.scrollHeight - container.scrollTop - container.clientHeight <
            streamAutoScrollThresholdPx,
      )

      setLiveMessages((prev) =>
        prev.map((message) =>
          message.id === assistantMessageId
            ? { ...message, text: `${message.text}${contentChunk}` }
            : message,
        ),
      )

      if (shouldStickToBottom) {
        window.requestAnimationFrame(() => {
          const currentContainer = messageListRef.current
          if (!currentContainer) return
          currentContainer.scrollTop = currentContainer.scrollHeight
        })
      }
    },
    [messageListRef, setLiveMessages],
  )

  const overrideAssistantContent = useCallback(
    (assistantMessageId: string, content: string) => {
      const container = messageListRef.current
      const shouldStickToBottom = Boolean(
        container &&
          container.scrollHeight - container.scrollTop - container.clientHeight <
            streamAutoScrollThresholdPx,
      )

      setLiveMessages((prev) =>
        prev.map((message) =>
          message.id === assistantMessageId
            ? { ...message, text: content }
            : message,
        ),
      )

      if (shouldStickToBottom) {
        window.requestAnimationFrame(() => {
          const currentContainer = messageListRef.current
          if (!currentContainer) return
          currentContainer.scrollTop = currentContainer.scrollHeight
        })
      }
    },
    [messageListRef, setLiveMessages],
  )

  /**
   * Flushes buffered text into the target assistant message immediately
   * and cancels any pending delayed flush timer.
   */
  const flushPendingAssistantChunk = useCallback(() => {
    if (pendingAssistantChunkFlushTimerRef.current !== null) {
      window.clearTimeout(pendingAssistantChunkFlushTimerRef.current)
      pendingAssistantChunkFlushTimerRef.current = null
    }

    const assistantMessageId = pendingAssistantChunkMessageIdRef.current
    const bufferedChunk = pendingAssistantChunkRef.current
    if (!assistantMessageId || !bufferedChunk) {
      return
    }

    pendingAssistantChunkRef.current = ''
    appendAssistantChunk(assistantMessageId, bufferedChunk)
  }, [appendAssistantChunk])

  const clearPendingAssistantChunkBuffer = useCallback(() => {
    if (pendingAssistantChunkFlushTimerRef.current !== null) {
      window.clearTimeout(pendingAssistantChunkFlushTimerRef.current)
      pendingAssistantChunkFlushTimerRef.current = null
    }
    pendingAssistantChunkRef.current = ''
    pendingAssistantChunkMessageIdRef.current = null
  }, [])

  /**
   * Queues stream chunks by message id, with size/time thresholds:
   * - immediate flush for large buffer
   * - delayed flush for sparse chunk arrivals
   */
  const queueAssistantChunk = useCallback(
    (assistantMessageId: string, chunk: string) => {
      if (!chunk) {
        return
      }

      if (pendingAssistantChunkMessageIdRef.current !== assistantMessageId) {
        // Flush old message buffer before switching target message id to avoid cross-message contamination.
        flushPendingAssistantChunk()
        pendingAssistantChunkMessageIdRef.current = assistantMessageId
        pendingAssistantChunkRef.current = ''
      }

      pendingAssistantChunkRef.current += chunk
      if (pendingAssistantChunkRef.current.length >= streamChunkImmediateFlushSize) {
        flushPendingAssistantChunk()
        return
      }

      if (pendingAssistantChunkFlushTimerRef.current !== null) {
        return
      }

      // Time-based flush keeps low-frequency streams from waiting on size threshold only.
      pendingAssistantChunkFlushTimerRef.current = window.setTimeout(() => {
        pendingAssistantChunkFlushTimerRef.current = null
        flushPendingAssistantChunk()
      }, streamChunkFlushIntervalMs)
    },
    [flushPendingAssistantChunk],
  )

  const applyAssistantCitationDetails = useCallback(
    (assistantMessageId: string, citationDetails: ChatUiCitationDetail[]) => {
      if (citationDetails.length === 0) {
        return
      }

      setLiveMessages((prev) =>
        prev.map((message) => {
          if (message.id !== assistantMessageId) {
            return message
          }

          // Merge by marker so incremental citation events do not create duplicate badges.
          const mergedCitationDetails = mergeDistinctCitationDetails(
            message.citationDetails,
            citationDetails,
          )
          const currentCitationDetails = message.citationDetails ?? []
          const unchanged =
            currentCitationDetails.length === mergedCitationDetails.length &&
            currentCitationDetails.every(
              (citationDetail, idx) =>
                citationDetail.marker === mergedCitationDetails[idx]?.marker,
            )
          if (unchanged) {
            return message
          }

          return { ...message, citationDetails: mergedCitationDetails }
        }),
      )
    },
    [setLiveMessages],
  )

  return {
    clearPendingAssistantChunkBuffer,
    queueAssistantChunk,
    flushPendingAssistantChunk,
    overrideAssistantContent,
    applyAssistantCitationDetails,
  }
}
