import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react'
import { useInfiniteQuery, useMutation } from '@tanstack/react-query'
import {
  abortChatStream,
  createChatMessage,
  deleteChatContext,
  getChatRunningTask,
  listChatMessages,
  streamChatEvents,
} from '@/api/chat'
import i18n from '@/i18n'
import {
  chatMessagesPageLimit,
  getErrorMessage,
  isStreamTerminalEvent,
  shouldFireStreamCompleted,
  shouldFlushStreamEventImmediately,
  shouldFlushStreamEventOnNextFrame,
  sleep,
  streamReconnectDelayMs,
  streamReconnectMaxRetries,
  streamUiFlushIntervalMs,
} from './chatConversationCommon'
import type { StreamDisplayPhaseType } from './chatConversationCommon'
import { buildLiveMessagesAfterAbortRefresh, mapHistoryPagesToUiMessages } from './chatStreamDraftRetention'
import {
  clearCheckpoint,
  createThrottledCheckpointSaver,
  isCheckpointMatchingTask,
  loadCheckpoint,
} from './chatStreamCheckpoint'
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
  enableThinking: boolean
  onStreamCompleted?: () => void
}

interface UseChatConversationResult {
  displayMessages: ChatUiMessage[]
  isLoadingHistory: boolean
  isFetchingMore: boolean
  isStreaming: boolean
  activeAssistantMessageId: string | null
  copiedUserMessageId: string | null
  errorText: string
  isClearingContext: boolean
  showScrollToBottomButton: boolean
  canSubmit: boolean
  isInputDisabled: boolean
  isAbortDisabled: boolean
  isThinkingToggleDisabled: boolean
  messageListRef: RefObject<HTMLDivElement | null>
  composerRestoreNonce: number
  composerRestoreValue: string
  onMessageListScroll: () => void
  onCopyUserMessage: (messageId: string, text: string) => void
  onSendMessage: (prompt: string) => void
  onAbortStream: () => void
  onClearCurrentContext: () => void
  smoothScrollToBottom: () => void
  sendPrompt: (prompt: string) => void
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
  enableThinking,
  onStreamCompleted,
}: UseChatConversationParams): UseChatConversationResult {
  const [liveMessages, setLiveMessages] = useState<ChatUiMessage[]>([])
  // Phase/status text is rendered from message fragments; keep these off React state
  // so stream phase ticks do not re-render ChatPanel (rerender-use-ref-transient-values).
  const streamStatusRef = useRef('')
  const streamPhaseTypeRef = useRef<StreamDisplayPhaseType>(null)
  const setStreamStatus = useCallback<Dispatch<SetStateAction<string>>>((value) => {
    streamStatusRef.current =
      typeof value === 'function' ? value(streamStatusRef.current) : value
  }, [])
  const setStreamPhaseType = useCallback<Dispatch<SetStateAction<StreamDisplayPhaseType>>>((value) => {
    streamPhaseTypeRef.current =
      typeof value === 'function' ? value(streamPhaseTypeRef.current) : value
  }, [])
  const [composerRestoreNonce, setComposerRestoreNonce] = useState(0)
  const [composerRestoreValue, setComposerRestoreValue] = useState('')
  const [errorText, setErrorText] = useState('')
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [activeAssistantMessageId, setActiveAssistantMessageId] = useState<string | null>(null)
  const [isClearingContext, setIsClearingContext] = useState(false)

  const messageListRef = useRef<HTMLDivElement | null>(null)
  const streamAbortControllerRef = useRef<AbortController | null>(null)
  const abortRequestedRef = useRef(false)
  const loadingMoreHistoryRef = useRef(false)
  const messageListScrollRafRef = useRef<number | null>(null)
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
  const onStreamCompletedRef = useRef(onStreamCompleted)
  useEffect(() => {
    onStreamCompletedRef.current = onStreamCompleted
  }, [onStreamCompleted])
  const { copiedUserMessageId, onCopyUserMessage, clearCopyFeedback } = useCopyFeedback({
    setErrorText,
  })
  const {
    showScrollToBottomButton,
    isProgrammaticScrollToBottomRef,
    stickToBottomRef,
    scrollToBottom,
    scrollToBottomIfStuck,
    smoothScrollToBottom,
    syncScrollToBottomButtonVisibility,
    syncStickToBottomFromUserScroll,
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

  const displayMessages = useMemo(() => {
    const historyIds = new Set(historyMessages.map((message) => message.id))
    const dedupedLiveMessages = liveMessages.filter((message) => !historyIds.has(message.id))
    return [...historyMessages, ...dedupedLiveMessages]
  }, [historyMessages, liveMessages])

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
      scrollToBottomIfStuck()
    },
    [messagesQuery, scrollToBottomIfStuck],
  )

  useEffect(() => {
    return () => {
      // Unmount cleanup invalidates in-flight stream work and removes UI timers/buffers.
      // Must clear streaming latches: React Strict Mode remounts after this cleanup; if
      // activeTaskId stays set, the resume effect would skip and never reconnect SSE.
      invalidateStreamRunToken()
      abortActiveStreamController()
      setActiveTaskId(null)
      setActiveAssistantMessageId(null)
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

  useLayoutEffect(() => {
    // Stream completion grows the last bubble (actions, deferred markdown, history
    // swap) without a token event; pin to bottom after that layout if still following.
    if (messagesQuery.isFetchingNextPage || messagesQuery.isLoading) return
    scrollToBottomIfStuck()
  }, [
    displayMessages,
    isStreaming,
    messagesQuery.isFetchingNextPage,
    messagesQuery.isLoading,
    scrollToBottomIfStuck,
  ])

  /**
   * Runs the streaming loop for one assistant response.
   * It uses a monotonically increasing run token to invalidate stale async callbacks,
   * retries transient disconnects, and finalizes history refresh once streaming ends.
   */
  const runStreamSession = useCallback(
    async (
      taskId: string,
      assistantMessageId: string,
      options?: {
        initialLastStreamId?: string
        initialAssistantMessage?: ChatUiMessage
      },
    ) => {
      // Each run gets a unique token so reconnect loops/events from old runs cannot mutate current state.
      const runToken = ++streamRunTokenRef.current
      let lastStreamId = options?.initialLastStreamId ?? ''
      let reconnectCount = 0
      let finished = false

      const assistantMsg = options?.initialAssistantMessage
        ? cloneChatUiMessage(options.initialAssistantMessage)
        : createEmptyAssistantMessage(assistantMessageId)
      if (!assistantMsg.clientKey) {
        assistantMsg.clientKey = assistantMessageId
      }
      const assistantClientKey = assistantMsg.clientKey
      let currentAssistantMessageId = assistantMsg.id
      let liveMessageFlushRafId: number | null = null
      let liveMessageFlushTimerId: number | null = null
      let lastStreamPhaseSummary = ''
      const checkpointSaver = createThrottledCheckpointSaver()

      const persistCheckpoint = () => {
        checkpointSaver.schedule({
          chatId,
          taskId,
          lastStreamId,
          assistantMessage: cloneChatUiMessage(assistantMsg),
        })
      }

      const flushCheckpointNow = () => {
        checkpointSaver.flush()
      }

      const onPageHide = () => {
        flushCheckpointNow()
      }
      window.addEventListener('pagehide', onPageHide)
      window.addEventListener('beforeunload', onPageHide)

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
        updateLiveMessage(assistantClientKey, cloneChatUiMessage(assistantMsg))
        syncStreamStatusFromMessage(assistantMsg)
      }

      const scheduleLiveMessageFlushOnNextFrame = () => {
        if (liveMessageFlushRafId !== null) {
          return
        }
        liveMessageFlushRafId = window.requestAnimationFrame(flushLiveMessage)
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

      setActiveTaskId(taskId)
      clearStreamStatusSchedule()
      applyStreamStatusImmediately(null, '')
      setAbortRequestedFlag(false)

      while (runToken === streamRunTokenRef.current) {
        try {
          const controller = new AbortController()
          streamAbortControllerRef.current = controller
          let shouldStopAfterStream = false

          const streamEndStatus = await streamChatEvents({
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
              if (streamEvent.error?.message) {
                // 流式错误事件只有后端原文，没有业务码；统一换成前端文案。
                setErrorText(i18n.t('chat:error.generateFailed'))
              }
              if (isStreamTerminalEvent(streamEvent)) {
                if (streamEvent.id) {
                  lastStreamId = streamEvent.id
                }
                flushLiveMessageImmediately()
                finished = true
                clearStreamStatusSchedule()
                setStreamPhaseType(null)
                setStreamStatus('')
                controller.abort()
                return
              }

              applyStreamEventInPlace(assistantMsg, streamEvent)
              if (streamEvent.id) {
                lastStreamId = streamEvent.id
              }
              persistCheckpoint()
              // Phase labels are the main pre-text UX; flush immediately so a refresh
              // during "检索证据" etc. can restore the status from localStorage.
              if (streamEvent.p === 'm.f.phase') {
                flushCheckpointNow()
              }
              if (assistantMsg.id !== currentAssistantMessageId) {
                currentAssistantMessageId = assistantMsg.id
                flushLiveMessageImmediately()
                return
              }
              if (shouldFlushStreamEventImmediately(streamEvent)) {
                flushLiveMessageImmediately()
                return
              }
              if (shouldFlushStreamEventOnNextFrame(streamEvent)) {
                scheduleLiveMessageFlushOnNextFrame()
                return
              }
              scheduleLiveMessageFlush()
            },
          })

          flushLiveMessageImmediately()

          // 服务端明确报告任务已结束（如连接建立时任务已完成）属于正常完成，
          // 无需重连，也不应提示“流式连接中断”。
          if (streamEndStatus === 'task-not-running') {
            break
          }

          shouldStopAfterStream = abortRequestedRef.current || finished
          if (!shouldStopAfterStream) {
            if (reconnectCount >= streamReconnectMaxRetries) {
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
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('beforeunload', onPageHide)

      if (runToken !== streamRunTokenRef.current) {
        checkpointSaver.dispose()
        return
      }

      checkpointSaver.dispose()
      clearCheckpoint(chatId)

      const streamWasAborted = abortRequestedRef.current
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
      if (shouldFireStreamCompleted(finished, streamWasAborted)) {
        onStreamCompletedRef.current?.()
      }
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

  const activeTaskIdRef = useRef(activeTaskId)
  activeTaskIdRef.current = activeTaskId
  const createMessagePendingRef = useRef(createMessageMutation.isPending)
  createMessagePendingRef.current = createMessageMutation.isPending
  const runStreamSessionRef = useRef(runStreamSession)
  runStreamSessionRef.current = runStreamSession
  // Dedupe concurrent getChatRunningTask for the same chat (Strict Mode remount).
  const streamTaskRequestRef = useRef<{
    chatId: string
    promise: Promise<{ task_id: string }>
  } | null>(null)

  /**
   * After first-page history succeeds, resume an in-flight server stream if any.
   * Restores localStorage checkpoint when task ids match; otherwise empty bubble.
   * Intentionally omits runStreamSession from deps (held in ref) so identity churn
   * does not re-fire stream-task; in-flight GETs are shared per chatId.
   *
   * Do NOT use a "already resumed for chatId" latch across effect remounts: React
   * Strict Mode runs mount→cleanup→mount, and a latch set on the first mount
   * would skip the second mount and kill resume entirely (including 0-0 replay).
   */
  useEffect(() => {
    if (!chatId || !messagesQuery.isSuccess) {
      return
    }

    let cancelled = false

    const resumeIfNeeded = async () => {
      if (activeTaskIdRef.current || createMessagePendingRef.current) {
        return
      }
      try {
        if (
          streamTaskRequestRef.current === null ||
          streamTaskRequestRef.current.chatId !== chatId
        ) {
          streamTaskRequestRef.current = {
            chatId,
            promise: getChatRunningTask(chatId),
          }
        }
        const running = await streamTaskRequestRef.current.promise
        if (cancelled) {
          return
        }
        if (!running.task_id) {
          clearCheckpoint(chatId)
          return
        }
        if (activeTaskIdRef.current || createMessagePendingRef.current) {
          return
        }

        const checkpoint = loadCheckpoint(chatId)
        if (isCheckpointMatchingTask(checkpoint, running.task_id)) {
          const restored = cloneChatUiMessage(checkpoint.assistantMessage)
          if (!restored.clientKey) {
            restored.clientKey = restored.id
          }
          // PhaseStatusIndicator only renders when isActiveAssistant; the list matches
          // activeAssistantMessageId against clientKey ?? id (stable local key across
          // server id rewrites). Must use clientKey here or restored phase UI is blank.
          const activeKey = restored.clientKey
          setActiveAssistantMessageId(activeKey)
          setLiveMessages([restored])
          await runStreamSessionRef.current(running.task_id, activeKey, {
            initialLastStreamId: checkpoint.lastStreamId || undefined,
            initialAssistantMessage: restored,
          })
          return
        }

        clearCheckpoint(chatId)
        const assistantMessageId = `local-assistant-${Date.now()}`
        setActiveAssistantMessageId(assistantMessageId)
        setLiveMessages((prev) => [...prev, createEmptyAssistantMessage(assistantMessageId)])
        await runStreamSessionRef.current(running.task_id, assistantMessageId)
      } catch (error) {
        if (cancelled) {
          return
        }
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
        // Silent: resume failure must not block normal chat.
      }
    }

    void resumeIfNeeded()

    return () => {
      cancelled = true
    }
  }, [chatId, messagesQuery.isSuccess])

  /**
   * Sends a user prompt optimistically, creates temporary local bubbles,
   * then hands over to stream runner for incremental assistant updates.
   */
  const handleSendMessage = useCallback(async (promptInput: string) => {
    if (!chatId) return
    if (isStreaming || createMessageMutation.isPending) return

    const prompt = promptInput.trimEnd()
    if (!prompt.trim()) return

    setErrorText('')
    shouldAutoScrollToBottomRef.current = true
    clearCheckpoint(chatId)

    const userMessageId = `local-user-${Date.now()}`
    const assistantMessageId = `local-assistant-${Date.now()}`
    setActiveAssistantMessageId(assistantMessageId)
    setLiveMessages((prev) => [
      ...prev,
      {
        id: userMessageId,
        clientKey: userMessageId,
        role: 'user',
        createTime: Date.now(),
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
      setActiveTaskId(created.task_id)
      await runStreamSession(created.task_id, assistantMessageId)
    } catch (error) {
      setErrorText(getErrorMessage(error))
      setComposerRestoreValue(prompt)
      setComposerRestoreNonce((prev) => prev + 1)
      setActiveAssistantMessageId(null)
      setLiveMessages((prev) =>
        prev.filter(
          (message) =>
            message.id !== userMessageId && message.id !== assistantMessageId,
        ),
      )
    }
  }, [
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
    setStreamStatus(i18n.t('chat:stream.aborting'))
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

  const hasNextHistoryPage = messagesQuery.hasNextPage
  const isFetchingNextHistoryPage = messagesQuery.isFetchingNextPage
  const isLoadingHistoryMessages = messagesQuery.isLoading
  const historyPageCount = messagesQuery.data?.pages.length ?? 0
  const fetchNextHistoryPage = messagesQuery.fetchNextPage

  const handleMessageListScroll = useCallback(() => {
    if (messageListScrollRafRef.current !== null) {
      return
    }

    messageListScrollRafRef.current = window.requestAnimationFrame(() => {
      messageListScrollRafRef.current = null
      const container = messageListRef.current
      if (!container) return

      if (isProgrammaticScrollToBottomRef.current) {
        return
      }
      syncStickToBottomFromUserScroll()
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
        !hasNextHistoryPage ||
        loadingMoreHistoryRef.current ||
        isFetchingNextHistoryPage ||
        isLoadingHistoryMessages
      ) {
        return
      }

      pendingScrollRestoreRef.current = {
        // Keep viewport anchored when prepending older history pages at the top.
        prevHeight: container.scrollHeight,
        prevTop: container.scrollTop,
        anchorMessageId: firstVisibleMessageId,
        anchorOffsetTop: firstVisibleMessageOffsetTop,
        historyPageCount,
      }
      setErrorText('')
      shouldAutoScrollToBottomRef.current = false
      stickToBottomRef.current = false
      loadingMoreHistoryRef.current = true
      void fetchNextHistoryPage()
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
    })
  }, [
    fetchNextHistoryPage,
    hasNextHistoryPage,
    historyPageCount,
    isFetchingNextHistoryPage,
    isLoadingHistoryMessages,
    isProgrammaticScrollToBottomRef,
    stickToBottomRef,
    syncScrollToBottomButtonVisibility,
    syncStickToBottomFromUserScroll,
  ])

  const onSendMessage = useCallback((prompt: string) => {
    void handleSendMessage(prompt)
  }, [handleSendMessage])

  const sendPrompt = useCallback((prompt: string) => {
    void handleSendMessage(prompt)
  }, [handleSendMessage])

  const onAbortStream = useCallback(() => {
    void handleAbortStream()
  }, [handleAbortStream])

  const onClearCurrentContext = useCallback(() => {
    const clearContext = async () => {
      // Clearing context during generation can race with stream updates, so guard it explicitly.
      if (isStreaming || isClearingContext) {
        setErrorText(i18n.t('chat:error.clearWhileStreaming'))
        return
      }
      if (!chatId) {
        setErrorText(i18n.t('chat:error.clearNoSession'))
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

  return {
    displayMessages,
    isLoadingHistory: messagesQuery.isLoading,
    isFetchingMore: messagesQuery.isFetchingNextPage,
    isStreaming,
    activeAssistantMessageId,
    copiedUserMessageId,
    errorText,
    isClearingContext,
    showScrollToBottomButton,
    canSubmit: Boolean(chatId) && !isStreaming && !createMessageMutation.isPending,
    isInputDisabled: !chatId || isStreaming,
    isAbortDisabled: abortStreamMutation.isPending || !activeTaskId,
    isThinkingToggleDisabled: isStreaming || createMessageMutation.isPending,
    messageListRef,
    composerRestoreNonce,
    composerRestoreValue,
    onMessageListScroll: handleMessageListScroll,
    onCopyUserMessage,
    onSendMessage,
    onAbortStream,
    onClearCurrentContext,
    smoothScrollToBottom,
    sendPrompt,
  }
}
