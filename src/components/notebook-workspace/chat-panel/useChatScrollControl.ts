import { useCallback, useRef, useState } from 'react'
import type { RefObject } from 'react'
import {
  scrollToBottomAnimationDurationMs,
  showScrollToBottomButtonThresholdPx,
  smoothScrollDeltaEpsilonPx,
} from './chatConversationCommon'

interface UseChatScrollControlParams {
  messageListRef: RefObject<HTMLDivElement | null>
}

interface UseChatScrollControlResult {
  showScrollToBottomButton: boolean
  isProgrammaticScrollToBottomRef: RefObject<boolean>
  scrollToBottom: () => void
  smoothScrollToBottom: () => void
  syncScrollToBottomButtonVisibility: () => void
  stopScrollToBottomAnimation: () => void
  resetScrollControl: () => void
}

export function useChatScrollControl({
  messageListRef,
}: UseChatScrollControlParams): UseChatScrollControlResult {
  const [showScrollToBottomButton, setShowScrollToBottomButton] = useState(false)
  const scrollToBottomAnimationRafRef = useRef<number | null>(null)
  const isProgrammaticScrollToBottomRef = useRef(false)

  const stopScrollToBottomAnimation = useCallback(() => {
    if (scrollToBottomAnimationRafRef.current !== null) {
      window.cancelAnimationFrame(scrollToBottomAnimationRafRef.current)
      scrollToBottomAnimationRafRef.current = null
    }
    isProgrammaticScrollToBottomRef.current = false
  }, [])

  const syncScrollToBottomButtonVisibility = useCallback(() => {
    const container = messageListRef.current
    if (!container) {
      setShowScrollToBottomButton(false)
      return
    }
    const distanceToBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight
    const nextVisible = distanceToBottom > showScrollToBottomButtonThresholdPx
    setShowScrollToBottomButton((prev) => (prev === nextVisible ? prev : nextVisible))
  }, [messageListRef])

  const scrollToBottom = useCallback(() => {
    const container = messageListRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
    setShowScrollToBottomButton(false)
  }, [messageListRef])

  const smoothScrollToBottom = useCallback(() => {
    const container = messageListRef.current
    if (!container) return

    const startTop = container.scrollTop
    const targetTop = Math.max(container.scrollHeight - container.clientHeight, 0)
    const delta = targetTop - startTop
    if (Math.abs(delta) < smoothScrollDeltaEpsilonPx) {
      setShowScrollToBottomButton(false)
      return
    }

    stopScrollToBottomAnimation()
    isProgrammaticScrollToBottomRef.current = true
    setShowScrollToBottomButton(false)

    const startedAt = performance.now()
    const easeOutCubic = (t: number) => 1 - (1 - t) ** 3

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / scrollToBottomAnimationDurationMs, 1)
      container.scrollTop = startTop + delta * easeOutCubic(progress)
      if (progress < 1) {
        scrollToBottomAnimationRafRef.current = window.requestAnimationFrame(tick)
        return
      }
      scrollToBottomAnimationRafRef.current = null
      isProgrammaticScrollToBottomRef.current = false
      syncScrollToBottomButtonVisibility()
    }

    scrollToBottomAnimationRafRef.current = window.requestAnimationFrame(tick)
  }, [messageListRef, stopScrollToBottomAnimation, syncScrollToBottomButtonVisibility])

  const resetScrollControl = useCallback(() => {
    stopScrollToBottomAnimation()
    setShowScrollToBottomButton(false)
  }, [stopScrollToBottomAnimation])

  return {
    showScrollToBottomButton,
    isProgrammaticScrollToBottomRef,
    scrollToBottom,
    smoothScrollToBottom,
    syncScrollToBottomButtonVisibility,
    stopScrollToBottomAnimation,
    resetScrollControl,
  }
}
