import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { copyFeedbackVisibleMs, writeTextWithFallback } from './chatConversationCommon'

interface UseCopyFeedbackParams {
  setErrorText: Dispatch<SetStateAction<string>>
}

interface UseCopyFeedbackResult {
  copiedUserMessageId: string | null
  onCopyUserMessage: (messageId: string, text: string) => void
  clearCopyFeedback: () => void
}

export function useCopyFeedback({
  setErrorText,
}: UseCopyFeedbackParams): UseCopyFeedbackResult {
  const [copiedUserMessageId, setCopiedUserMessageId] = useState<string | null>(null)
  const copyFeedbackTimerRef = useRef<number | null>(null)
  const clearCopyFeedbackTimer = useCallback(() => {
    if (copyFeedbackTimerRef.current !== null) {
      window.clearTimeout(copyFeedbackTimerRef.current)
      copyFeedbackTimerRef.current = null
    }
  }, [])

  const clearCopyFeedback = useCallback(() => {
    clearCopyFeedbackTimer()
    setCopiedUserMessageId(null)
  }, [clearCopyFeedbackTimer])

  useEffect(() => {
    return clearCopyFeedbackTimer
  }, [clearCopyFeedbackTimer])

  const onCopyUserMessage = useCallback(
    (messageId: string, text: string) => {
      const copy = async () => {
        const normalized = text.trim()
        if (!normalized) return

        try {
          await writeTextWithFallback(normalized)
          setCopiedUserMessageId(messageId)
          clearCopyFeedbackTimer()
          copyFeedbackTimerRef.current = window.setTimeout(() => {
            setCopiedUserMessageId((prev) => (prev === messageId ? null : prev))
            copyFeedbackTimerRef.current = null
          }, copyFeedbackVisibleMs)
        } catch {
          setErrorText('复制失败，请手动复制。')
        }
      }

      void copy()
    },
    [clearCopyFeedbackTimer, setErrorText],
  )

  return {
    copiedUserMessageId,
    onCopyUserMessage,
    clearCopyFeedback,
  }
}
