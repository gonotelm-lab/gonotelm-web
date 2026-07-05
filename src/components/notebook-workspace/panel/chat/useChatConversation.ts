import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react'
import { useInfiniteQuery, useMutation } from '@tanstack/react-query'
import {
  abortChatStream,
  createChatMessage,
  deleteChatContext,
  listChatMessages,
  streamChatEvents,
} from '@/api/chat'
import type { StreamDisplayPhaseType } from './chatConversationCommon'
import {
  chatMessagesPageLimit,
  getErrorMessage,
  isStreamTerminalEvent,
  sleep,
  streamReconnectDelayMs,
  streamReconnectMaxRetries,
  streamUiFlushIntervalMs,
} from './chatConversationCommon'
import { buildLiveMessagesAfterAbortRefresh, mapHistoryPagesToUiMessages } from './chatStreamDraftRetention'
import type { ChatAnswerLengthOption, ChatStyleOption } from './chatSettings'
import type { ChatUiMessage } from './types'
import { useLiveMessageUpdater } from './useLiveMessageUpdater'
import {
  applyStreamEventInPlace,
  cloneChatUiMessage,
  createEmptyAssistantMessage,
  extractLatestPhaseSummary,
} from './streamEventReducer'
import type { StreamTaskEvent } from '@/types/api'
import { useChatScrollControl } from './useChatScrollControl'
import { useCopyFeedback } from './useCopyFeedback'
import { useStreamStatusScheduler } from './useStreamStatusScheduler'

interface UseChatConversationParams {
  chatId: string
  selectedSourceIds: string[]
  chatStyle: ChatStyleOption
  answerLength: ChatAnswerLengthOption
}

interface UseChatConversationResult {
  composerValue: string
  enableThinking: boolean
  displayMessages: ChatUiMessage[]
  streamStatus: string
  streamPhaseType: StreamDisplayPhaseType
  showStreamStatus: boolean
  showStreamFlowAnimation: boolean
  isLoadingHistory: boolean
  isFetchingMore: boolean
  isStreaming: boolean
  activeAssistantMessageId: string | null
  copiedUserMessageId: string | null
  errorText: string
  isClearingContext: boolean
  showScrollToBottomButton: boolean
  submitDisabled: boolean
  isInputDisabled: boolean
  isAbortDisabled: boolean
  isThinkingToggleDisabled: boolean
  messageListRef: RefObject<HTMLDivElement | null>
  setComposerValue: (value: string) => void
  setEnableThinking: (enabled: boolean) => void
  onMessageListScroll: () => void
  onCopyUserMessage: (messageId: string, text: string) => void
  onComposerKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
  onSendMessage: () => void
  onAbortStream: () => void
  onClearCurrentContext: () => void
  smoothScrollToBottom: () => void
}

interface RefreshHistoryAfterStreamOptions {
  preserveAssistantDraftOnAbort?: boolean
}

const chatMessageSelector = '[data-message-id]'
const getVisibleMessageStats = (container: HTMLDivElement) => {
  const containerRect = container.getBoundingClientRect()
  const messageItems = container.querySelectorAll<HTMLElement>(chatMessageSelector)
  const totalMessageCount = messageItems.length
  for (let index = 0; index < messageItems.length; index += 1) {
    const messageItem = messageItems[index]
    const rect = messageItem?.getBoundingClientRect()
    if (!rect) continue
    if (rect.bottom > containerRect.top && rect.top < containerRect.bottom) {
      return {
        firstVisibleMessageIndex: index,
        totalMessageCount,
        firstVisibleMessageId: messageItem.dataset.messageId ?? '',
        firstVisibleMessageOffsetTop: rect.top - containerRect.top,
      }
    }
  }
  return {
    firstVisibleMessageIndex: -1,
    totalMessageCount,
    firstVisibleMessageId: '',
    firstVisibleMessageOffsetTop: 0,
  }
}

/**
 * Coordinates the full chat conversation lifecycle for the panel:
 * - merges persisted history with live stream drafts
 * - manages send/stream/abort/reconnect state transitions
 * - keeps message-list scrolling predictable during pagination and streaming
 */
export function useChatConversation({
  chatId,
  selectedSourceIds,
  chatStyle,
  answerLength,
}: UseChatConversationParams): UseChatConversationResult {
  const [composerValue, setComposerValue] = useState('')
  const [liveMessages, setLiveMessages] = useState<ChatUiMessage[]>([])
  const [streamStatus, setStreamStatus] = useState('')
  const [streamPhaseType, setStreamPhaseType] = useState<StreamDisplayPhaseType>(null)
  const [errorText, setErrorText] = useState('')
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [activeAssistantMessageId, setActiveAssistantMessageId] = useState<string | null>(null)
  const [enableThinking, setEnableThinking] = useState(false)
  const [isClearingContext, setIsClearingContext] = useState(false)

  const messageListRef = useRef<HTMLDivElement | null>(null)
  const streamAbortControllerRef = useRef<AbortController | null>(null)
  const abortRequestedRef = useRef(false)
  const loadingMoreHistoryRef = useRef(false)
  const pendingScrollRestoreRef = useRef<{
    prevHeight: number
    prevTop: number
    anchorMessageId: string
    anchorOffsetTop: number
    historyPageCount: number
  } | null>(null)
  const shouldAutoScrollToBottomRef = useRef(true)
  // Bump this token whenever a stream lifecycle resets, so stale async handlers can self-cancel.
  const streamRunTokenRef = useRef(0)
  const { copiedUserMessageId, onCopyUserMessage, clearCopyFeedback } = useCopyFeedback({
    setErrorText,
  })
  const {
    showScrollToBottomButton,
    isProgrammaticScrollToBottomRef,
    scrollToBottom,
    smoothScrollToBottom,
    syncScrollToBottomButtonVisibility,
    stopScrollToBottomAnimation,
    resetScrollControl,
  } = useChatScrollControl({
    messageListRef,
  })

  const {
    clearStreamStatusSchedule,
    applyStreamStatusImmediately,
    queueStreamStatus,
    resetLastStreamStatusAt,
  } = useStreamStatusScheduler({
    setStreamPhaseType,
    setStreamStatus,
  })

  const { updateLiveMessage } = useLiveMessageUpdater({
    messageListRef,
    setLiveMessages,
  })

  const createMessageMutation = useMutation({
    mutationFn: createChatMessage,
  })
  const abortStreamMutation = useMutation({
    mutationFn: abortChatStream,
  })

  const messagesQuery = useInfiniteQuery({
    queryKey: ['chat-messages', chatId],
    enabled: Boolean(chatId),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      listChatMessages({
        id: chatId,
        cursor: typeof pageParam === 'number' ? pageParam : 0,
        limit: chatMessagesPageLimit,
      }),
    getNextPageParam: (lastPage) => (lastPage.has_more ? lastPage.next_cursor : undefined),
  })

  const historyMessages = useMemo(
    () => mapHistoryPagesToUiMessages(messagesQuery.data?.pages ?? []),
    [messagesQuery.data?.pages],
  )

  const displayMessages = useMemo(
    () => [...historyMessages, ...liveMessages],
    [historyMessages, liveMessages],
  )

  const isStreaming = Boolean(activeTaskId)
  const invalidateStreamRunToken = useCallback(() => {
    streamRunTokenRef.current += 1
  }, [])
  const abortActiveStreamController = useCallback(() => {
    const activeController = streamAbortControllerRef.current
    if (!activeController) {
      return
    }
    activeController.abort()
    streamAbortControllerRef.current = null
  }, [])
  const resetStreamAbortController = useCallback(() => {
    streamAbortControllerRef.current = null
  }, [])
  const setAbortRequestedFlag = useCallback((requested: boolean) => {
    abortRequestedRef.current = requested
  }, [])

  /**
   * Re-syncs UI with server history after a stream session settles.
   * When the user aborts streaming, it can preserve the latest assistant draft
   * if that draft has not been persisted in refreshed history yet.
   */
  const refreshHistoryAfterStream = useCallback(
    async (options?: RefreshHistoryAfterStreamOptions) => {
      // Re-sync from server as source of truth, while optionally keeping local assistant draft after abort.
      const result = await messagesQuery.refetch()
      if (result.error) {
        setErrorText(getErrorMessage(result.error))
        return
      }
      const fetchedHistoryMessages = mapHistoryPagesToUiMessages(result.data?.pages ?? [])
      setLiveMessages((previousLiveMessages) => {
        if (!options?.preserveAssistantDraftOnAbort) {
          return []
        }
        return buildLiveMessagesAfterAbortRefresh(previousLiveMessages, fetchedHistoryMessages)
      })
      scrollToBottom()
    },
    [messagesQuery, scrollToBottom],
  )

  useEffect(() => {
    return () => {
      // Unmount cleanup invalidates in-flight stream work and removes UI timers/buffers.
      invalidateStreamRunToken()
      abortActiveStreamController()
      setAbortRequestedFlag(false)
      clearStreamStatusSchedule()
      stopScrollToBottomAnimation()
      clearCopyFeedback()
      resetScrollControl()
    }
  }, [
    abortActiveStreamController,
    clearCopyFeedback,
    clearStreamStatusSchedule,
    invalidateStreamRunToken,
    setAbortRequestedFlag,
    resetScrollControl,
    stopScrollToBottomAnimation,
  ])

  useLayoutEffect(() => {
    if (messagesQuery.isFetchingNextPage) return
    const pending = pendingScrollRestoreRef.current
    const container = messageListRef.current
    if (!pending || !container) return

    const currentHistoryPageCount = messagesQuery.data?.pages.length ?? 0
    if (currentHistoryPageCount <= pending.historyPageCount) {
      // Fetch-more failed or produced no new page, so keep user's current viewport untouched.
      pendingScrollRestoreRef.current = null
      return
    }

    if (pending.anchorMessageId) {
      const messageItems = container.querySelectorAll<HTMLElement>(chatMessageSelector)
      const anchorItem = Array.from(messageItems).find(
        (item) => item.dataset.messageId === pending.anchorMessageId,
      )
      if (anchorItem) {
        const containerRect = container.getBoundingClientRect()
        const anchorRect = anchorItem.getBoundingClientRect()
        const currentAnchorOffsetTop = anchorRect.top - containerRect.top
        const offsetDelta = currentAnchorOffsetTop - pending.anchorOffsetTop
        container.scrollTop += offsetDelta
        pendingScrollRestoreRef.current = null
        return
      }
    }

    const delta = container.scrollHeight - pending.prevHeight
    container.scrollTop = pending.prevTop + delta
    pendingScrollRestoreRef.current = null
  }, [messagesQuery.data?.pages.length, messagesQuery.isFetchingNextPage])

  useEffect(() => {
    syncScrollToBottomButtonVisibility()
  }, [
    displayMessages.length,
    messagesQuery.data?.pages.length,
    messagesQuery.isFetchingNextPage,
    messagesQuery.isLoading,
    syncScrollToBottomButtonVisibility,
  ])

  useEffect(() => {
    if (!shouldAutoScrollToBottomRef.current) return
    if (displayMessages.length === 0) return
    if (messagesQuery.isFetchingNextPage || messagesQuery.isLoading) return
    scrollToBottom()
    shouldAutoScrollToBottomRef.current = false
  }, [
    displayMessages.length,
    messagesQuery.isFetchingNextPage,
    messagesQuery.isLoading,
    scrollToBottom,
  ])

  /**
   * Runs the streaming loop for one assistant response.
   * It uses a monotonically increasing run token to invalidate stale async callbacks,
   * retries transient disconnects, and finalizes history refresh once streaming ends.
   */
  const runStreamSession = useCallback(
    async (taskId: string, assistantMessageId: string) => {
      // Each run gets a unique token so reconnect loops/events from old runs cannot mutate current state.
      const runToken = ++streamRunTokenRef.current
      let lastStreamId = ''
      let reconnectCount = 0
      let finished = false

      let assistantMsg = createEmptyAssistantMessage(assistantMessageId)
      let currentAssistantMessageId = assistantMessageId
      let liveMessageFlushRafId: number | null = null
      let liveMessageFlushTimerId: number | null = null
      let lastStreamPhaseSummary = ''

      const syncStreamStatusFromMessage = (message: ChatUiMessage) => {
        const hasResponseContent = message.fragments.some(
          (fragment) =>
            fragment.type === 'RESPONSE' && Boolean(fragment.response?.content?.trim()),
        )
        if (hasResponseContent) {
          lastStreamPhaseSummary = ''
          clearStreamStatusSchedule()
          setStreamPhaseType(null)
          setStreamStatus('')
          return
        }
        const phaseSummary = extractLatestPhaseSummary(message)
        if (!phaseSummary || phaseSummary === lastStreamPhaseSummary) {
          return
        }
        lastStreamPhaseSummary = phaseSummary
        queueStreamStatus('phase', phaseSummary)
      }

      const flushLiveMessage = () => {
        liveMessageFlushRafId = null
        updateLiveMessage(currentAssistantMessageId, cloneChatUiMessage(assistantMsg))
        syncStreamStatusFromMessage(assistantMsg)
      }

      const scheduleLiveMessageFlush = () => {
        if (liveMessageFlushRafId !== null || liveMessageFlushTimerId !== null) {
          return
        }
        liveMessageFlushTimerId = window.setTimeout(() => {
          liveMessageFlushTimerId = null
          liveMessageFlushRafId = window.requestAnimationFrame(flushLiveMessage)
        }, streamUiFlushIntervalMs)
      }

      const cancelLiveMessageFlush = () => {
        if (liveMessageFlushTimerId !== null) {
          window.clearTimeout(liveMessageFlushTimerId)
          liveMessageFlushTimerId = null
        }
        if (liveMessageFlushRafId !== null) {
          window.cancelAnimationFrame(liveMessageFlushRafId)
          liveMessageFlushRafId = null
        }
      }

      const flushLiveMessageImmediately = () => {
        cancelLiveMessageFlush()
        flushLiveMessage()
      }

      const shouldFlushStreamEventImmediately = (event: StreamTaskEvent) =>
        event.op !== 'APPEND'

      setActiveTaskId(taskId)
      clearStreamStatusSchedule()
      applyStreamStatusImmediately(null, '')
      setAbortRequestedFlag(false)

      while (runToken === streamRunTokenRef.current) {
        try {
          const controller = new AbortController()
          streamAbortControllerRef.current = controller
          let shouldStopAfterStream = false

          await streamChatEvents({
            id: chatId,
            task_id: taskId,
            last_stream_id: lastStreamId || undefined,
            signal: controller.signal,
            onEvent: (eventType, event) => {
              if (runToken !== streamRunTokenRef.current) return
              if (eventType === 'heartbeat' || 'heartbeat' in event) {
                return
              }

              const streamEvent = event as StreamTaskEvent
              if (streamEvent.id) {
                lastStreamId = streamEvent.id
              }
              if (streamEvent.error?.message) {
                setErrorText(streamEvent.error.message)
              }
              if (isStreamTerminalEvent(streamEvent)) {
                flushLiveMessageImmediately()
                finished = true
                clearStreamStatusSchedule()
                setStreamPhaseType(null)
                setStreamStatus('')
                controller.abort()
                return
              }

              applyStreamEventInPlace(assistantMsg, streamEvent)
              if (assistantMsg.id !== currentAssistantMessageId) {
                currentAssistantMessageId = assistantMsg.id
                setActiveAssistantMessageId(assistantMsg.id)
                flushLiveMessageImmediately()
                return
              }
              if (shouldFlushStreamEventImmediately(streamEvent)) {
                flushLiveMessageImmediately()
                return
              }
              scheduleLiveMessageFlush()
            },
          })

          flushLiveMessageImmediately()

          finished = true
          shouldStopAfterStream = abortRequestedRef.current || finished
          if (!shouldStopAfterStream) {
            if (reconnectCount >= streamReconnectMaxRetries) {
              setErrorText('流式连接中断，请稍后重试。')
              break
            }
            reconnectCount += 1
            clearStreamStatusSchedule()
            applyStreamStatusImmediately(null, '')
            await sleep(streamReconnectDelayMs)
          }
          if (shouldStopAfterStream) {
            break
          }
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            break
          }
          if (abortRequestedRef.current) {
            break
          }
          if (reconnectCount >= streamReconnectMaxRetries) {
            setErrorText(getErrorMessage(error))
            break
          }
          reconnectCount += 1
          clearStreamStatusSchedule()
          applyStreamStatusImmediately(null, '')
          await sleep(streamReconnectDelayMs)
        }
      }

      cancelLiveMessageFlush()

      if (runToken !== streamRunTokenRef.current) {
        return
      }

      setActiveTaskId(null)
      setActiveAssistantMessageId(null)
      clearStreamStatusSchedule()
      setStreamStatus('')
      setStreamPhaseType(null)
      resetLastStreamStatusAt()
      resetStreamAbortController()
      setAbortRequestedFlag(false)
      const preserveAssistantDraftOnAbort = abortRequestedRef.current
      await refreshHistoryAfterStream({ preserveAssistantDraftOnAbort })
    },
    [
      applyStreamStatusImmediately,
      clearStreamStatusSchedule,
      chatId,
      queueStreamStatus,
      refreshHistoryAfterStream,
      resetStreamAbortController,
      resetLastStreamStatusAt,
      setAbortRequestedFlag,
      updateLiveMessage,
    ],
  )

  /**
   * Sends a user prompt optimistically, creates temporary local bubbles,
   * then hands over to stream runner for incremental assistant updates.
   */
  const handleSendMessage = useCallback(async () => {
    if (!chatId) return
    if (isStreaming || createMessageMutation.isPending) return

    const prompt = composerValue.trimEnd()
    if (!prompt.trim()) return

    setErrorText('')
    setComposerValue('')
    shouldAutoScrollToBottomRef.current = true

    const userMessageId = `local-user-${Date.now()}`
    const assistantMessageId = `local-assistant-${Date.now()}`
    setActiveAssistantMessageId(assistantMessageId)
    setLiveMessages((prev) => [
      ...prev,
      {
        id: userMessageId,
        role: 'user',
        fragments: [{ id: 1, type: 'REQUEST', request: { content: prompt } }],
        citations: [],
      },
      createEmptyAssistantMessage(assistantMessageId),
    ])
    window.requestAnimationFrame(() => {
      scrollToBottom()
    })

    try {
      const created = await createMessageMutation.mutateAsync({
        id: chatId,
        prompt,
        source_ids: selectedSourceIds,
        enable_thinking: enableThinking,
        style: chatStyle,
        answer_length: answerLength,
      })
      await runStreamSession(created.task_id, assistantMessageId)
    } catch (error) {
      setErrorText(getErrorMessage(error))
      setComposerValue(prompt)
      setActiveAssistantMessageId(null)
      setLiveMessages((prev) =>
        prev.filter(
          (message) =>
            message.id !== userMessageId && message.id !== assistantMessageId,
        ),
      )
    }
  }, [
    composerValue,
    createMessageMutation,
    chatId,
    isStreaming,
    runStreamSession,
    scrollToBottom,
    selectedSourceIds,
    enableThinking,
    chatStyle,
    answerLength,
  ])

  const handleAbortStream = useCallback(async () => {
    if (!chatId || !activeTaskId) return
    if (abortStreamMutation.isPending) return

    setErrorText('')
    setStreamStatus('正在终止...')
    setAbortRequestedFlag(true)

    try {
      await abortStreamMutation.mutateAsync({
        id: chatId,
        task_id: activeTaskId,
      })
    } catch (error) {
      setErrorText(getErrorMessage(error))
    } finally {
      abortActiveStreamController()
    }
  }, [
    abortActiveStreamController,
    abortStreamMutation,
    activeTaskId,
    chatId,
    setAbortRequestedFlag,
  ])

  const handleMessageListScroll = useCallback(() => {
    const container = messageListRef.current
    if (!container) return

    if (isProgrammaticScrollToBottomRef.current) {
      return
    }
    syncScrollToBottomButtonVisibility()

    const {
      firstVisibleMessageIndex,
      totalMessageCount,
      firstVisibleMessageId,
      firstVisibleMessageOffsetTop,
    } = getVisibleMessageStats(container)
    const loadMoreFirstVisibleMessageThreshold = Math.max(
      1,
      Math.floor(totalMessageCount / 4),
    )
    const shouldLoadMoreByVisibleCount =
      firstVisibleMessageIndex >= 0 &&
      firstVisibleMessageIndex <= loadMoreFirstVisibleMessageThreshold

    if (
      !shouldLoadMoreByVisibleCount ||
      !messagesQuery.hasNextPage ||
      loadingMoreHistoryRef.current ||
      messagesQuery.isFetchingNextPage ||
      messagesQuery.isLoading
    ) {
      return
    }

    pendingScrollRestoreRef.current = {
      // Keep viewport anchored when prepending older history pages at the top.
      prevHeight: container.scrollHeight,
      prevTop: container.scrollTop,
      anchorMessageId: firstVisibleMessageId,
      anchorOffsetTop: firstVisibleMessageOffsetTop,
      historyPageCount: messagesQuery.data?.pages.length ?? 0,
    }
    setErrorText('')
    shouldAutoScrollToBottomRef.current = false
    loadingMoreHistoryRef.current = true
    void messagesQuery.fetchNextPage()
      .then((result) => {
        if (result.isError || result.isFetchNextPageError) {
          pendingScrollRestoreRef.current = null
          setErrorText(getErrorMessage(result.error))
        }
      })
      .catch((error) => {
        pendingScrollRestoreRef.current = null
        setErrorText(getErrorMessage(error))
      })
      .finally(() => {
        loadingMoreHistoryRef.current = false
      })
  }, [isProgrammaticScrollToBottomRef, messagesQuery, syncScrollToBottomButtonVisibility])

  const onSendMessage = useCallback(() => {
    void handleSendMessage()
  }, [handleSendMessage])

  const onComposerKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Enter' || event.shiftKey) {
        return
      }
      event.preventDefault()
      onSendMessage()
    },
    [onSendMessage],
  )

  const onAbortStream = useCallback(() => {
    void handleAbortStream()
  }, [handleAbortStream])

  const onClearCurrentContext = useCallback(() => {
    const clearContext = async () => {
      // Clearing context during generation can race with stream updates, so guard it explicitly.
      if (isStreaming || isClearingContext) {
        setErrorText('正在生成回复时不可清空上下文，请稍后再试。')
        return
      }
      if (!chatId) {
        setErrorText('当前会话不可用，无法清空上下文。')
        return
      }

      try {
        setIsClearingContext(true)
        await deleteChatContext(chatId)
      } catch (error) {
        setErrorText(getErrorMessage(error))
      } finally {
        setIsClearingContext(false)
      }
    }

    setErrorText('')
    void clearContext()
  }, [chatId, isClearingContext, isStreaming])

  const submitDisabled =
    !composerValue.trim() ||
    isStreaming ||
    createMessageMutation.isPending ||
    !chatId
  const showStreamStatus = Boolean(isStreaming && streamStatus && streamPhaseType === 'phase')
  const showStreamFlowAnimation = Boolean(isStreaming && streamPhaseType === 'phase')

  return {
    composerValue,
    enableThinking,
    displayMessages,
    streamStatus,
    streamPhaseType,
    showStreamStatus,
    showStreamFlowAnimation,
    isLoadingHistory: messagesQuery.isLoading,
    isFetchingMore: messagesQuery.isFetchingNextPage,
    isStreaming,
    activeAssistantMessageId,
    copiedUserMessageId,
    errorText,
    isClearingContext,
    showScrollToBottomButton,
    submitDisabled,
    isInputDisabled: !chatId || isStreaming,
    isAbortDisabled: abortStreamMutation.isPending || !activeTaskId,
    isThinkingToggleDisabled: isStreaming || createMessageMutation.isPending,
    messageListRef,
    setComposerValue,
    setEnableThinking,
    onMessageListScroll: handleMessageListScroll,
    onCopyUserMessage,
    onComposerKeyDown,
    onSendMessage,
    onAbortStream,
    onClearCurrentContext,
    smoothScrollToBottom,
  }
}
