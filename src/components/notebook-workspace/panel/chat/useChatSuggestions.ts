import { useCallback, useEffect, useRef, useState } from 'react'
import { getChatSuggestions } from '@/api/chat'
import { ApiError } from '@/lib/http'

const maxSuggestionCount = 3
/** 后端 ErrSuggestionGenerating（errors.ErrLockTaken）的业务码（HTTP 200 响应中的 code） */
const suggestionLockTakenCode = 1005
const suggestionRetryInitialBackoffMs = 1000
const suggestionRetryMaxBackoffMs = 30_000

const isSuggestionLockTakenError = (error: unknown): boolean =>
  error instanceof ApiError && error.code === suggestionLockTakenCode

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })

/**
 * 建议接口被后端分布式锁挡住时，用指数退避持续重试（1s 起，封顶 30s），
 * 直到成功或外部条件不再允许继续（如组件卸载）。
 */
const retrySuggestionsWithBackoff = async <T>(
  request: () => Promise<T>,
  shouldContinue: () => boolean,
): Promise<T | undefined> => {
  let backoffMs = suggestionRetryInitialBackoffMs
  for (;;) {
    try {
      return await request()
    } catch (error) {
      if (!isSuggestionLockTakenError(error)) throw error
      if (!shouldContinue()) return undefined
      await delay(backoffMs)
      backoffMs = Math.min(backoffMs * 2, suggestionRetryMaxBackoffMs)
    }
  }
}

interface UseChatSuggestionsParams {
  chatId: string
  readySourceIds: string[]
  selectedSourceIds: string[]
}

interface UseChatSuggestionsResult {
  suggestions: string[]
  fetchFollowup: () => void
}

export function useChatSuggestions({
  chatId,
  readySourceIds,
  selectedSourceIds,
}: UseChatSuggestionsParams): UseChatSuggestionsResult {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const openerTriggeredRef = useRef(false)
  const openerPendingRef = useRef(false)
  const readySeenRef = useRef<boolean | null>(null)
  const selectedSourceIdsRef = useRef(selectedSourceIds)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    selectedSourceIdsRef.current = selectedSourceIds
  }, [selectedSourceIds])

  const fetchSuggestions = useCallback(
    async (sourceIds: string[]) => {
      if (!chatId || sourceIds.length === 0) return
      try {
        const result = await retrySuggestionsWithBackoff(
          () => getChatSuggestions({ id: chatId, source_ids: sourceIds }),
          () => mountedRef.current,
        )
        if (!mountedRef.current || !result) return
        const questions = Array.isArray(result.questions) ? result.questions : []
        setSuggestions(questions.slice(0, maxSuggestionCount))
      } catch (error) {
        console.warn('fetch chat suggestions failed', error)
      }
    },
    [chatId],
  )

  // opener：仅在首次来源 ready 的跃迁后触发一次；请求只带面板中已选中的来源，
  // 若跃迁时尚未选中任何来源，则等用户首次选中后再触发。
  useEffect(() => {
    if (!chatId || openerTriggeredRef.current) return
    const hasReadySources = readySourceIds.length > 0
    const transitionedFromEmpty =
      readySeenRef.current !== null && !readySeenRef.current && hasReadySources
    readySeenRef.current = hasReadySources
    if (transitionedFromEmpty) {
      openerPendingRef.current = true
    }
    if (!openerPendingRef.current || selectedSourceIds.length === 0) return
    openerTriggeredRef.current = true
    openerPendingRef.current = false
    void fetchSuggestions(selectedSourceIds)
  }, [chatId, readySourceIds, selectedSourceIds, fetchSuggestions])

  const fetchFollowup = useCallback(() => {
    void fetchSuggestions(selectedSourceIdsRef.current)
  }, [fetchSuggestions])

  return {
    suggestions,
    fetchFollowup,
  }
}
