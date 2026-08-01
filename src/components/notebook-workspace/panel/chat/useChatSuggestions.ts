import { useCallback, useEffect, useRef, useState } from 'react'
import { getChatSuggestions } from '@/api/chat'

const maxSuggestionCount = 3

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
        const result = await getChatSuggestions({ id: chatId, source_ids: sourceIds })
        if (mountedRef.current) {
          setSuggestions(result.questions.slice(0, maxSuggestionCount))
        }
      } catch (error) {
        console.warn('fetch chat suggestions failed', error)
      }
    },
    [chatId],
  )

  useEffect(() => {
    if (!chatId) return
    const hasReadySources = readySourceIds.length > 0
    const transitionedFromEmpty =
      readySeenRef.current !== null && !readySeenRef.current && hasReadySources
    readySeenRef.current = hasReadySources
    if (openerTriggeredRef.current || !transitionedFromEmpty) return
    openerTriggeredRef.current = true
    void fetchSuggestions(readySourceIds)
  }, [chatId, readySourceIds, fetchSuggestions])

  const fetchFollowup = useCallback(() => {
    void fetchSuggestions(selectedSourceIdsRef.current)
  }, [fetchSuggestions])

  return {
    suggestions,
    fetchFollowup,
  }
}
