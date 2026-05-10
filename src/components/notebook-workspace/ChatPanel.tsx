import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft'
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight'
import {
  Box,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { useInfiniteQuery, useMutation } from '@tanstack/react-query'
import {
  abortChatStream,
  createChatMessage,
  listChatMessages,
  streamChatEvents,
} from '../../api/chat'
import { ApiError } from '../../lib/http'
import type { ChatMessageListItem, MessageStreamPhaseType } from '../../types/api'
import { panelTitleSx, panelTitleVariant } from './panelStyles'
import { ChatComposer } from './chat-panel/ChatComposer'
import { ChatMessagesList } from './chat-panel/ChatMessagesList'
import type { ChatUiMessage } from './chat-panel/types'

const chatMessagesPageLimit = 20
const scrollLoadTopThresholdPx = 260
const showScrollToBottomButtonThresholdPx = 80
const scrollToBottomAnimationDurationMs = 460
const streamReconnectDelayMs = 600
const streamStatusMinVisibleMs = 900
const scrollToBottomButtonTokens = {
  size: 32,
  rightPx: 7.8,
  marginBottom: 1.15,
}

interface ChatPanelProps {
  notebookId: string
  selectedSourceIds: string[]
  sourcesPanelCollapsed: boolean
  insightsPanelCollapsed: boolean
  onExpandSourcesPanel: () => void
  onExpandInsightsPanel: () => void
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return '请求失败，请稍后重试。'
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })

const writeTextWithFallback = async (text: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)
  if (!copied) {
    throw new Error('copy failed')
  }
}

const mapChatItemToUiMessage = (message: ChatMessageListItem): ChatUiMessage => {
  const msgRole = String(message.role).toLowerCase()
  return {
    id: message.id,
    role: msgRole === 'user' ? 'user' : 'assistant',
    text: message.content?.text?.content ?? '',
  }
}

export function ChatPanel({
  notebookId,
  selectedSourceIds,
  sourcesPanelCollapsed,
  insightsPanelCollapsed,
  onExpandSourcesPanel,
  onExpandInsightsPanel,
}: ChatPanelProps) {
  const [composerValue, setComposerValue] = useState('')
  const [liveMessages, setLiveMessages] = useState<ChatUiMessage[]>([])
  const [streamStatus, setStreamStatus] = useState('')
  const [streamPhaseType, setStreamPhaseType] = useState<MessageStreamPhaseType | null>(null)
  const [errorText, setErrorText] = useState('')
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [activeAssistantMessageId, setActiveAssistantMessageId] = useState<string | null>(null)
  const [copiedUserMessageId, setCopiedUserMessageId] = useState<string | null>(null)
  const [showScrollToBottomButton, setShowScrollToBottomButton] = useState(false)

  const messageListRef = useRef<HTMLDivElement | null>(null)
  const streamAbortControllerRef = useRef<AbortController | null>(null)
  const abortRequestedRef = useRef(false)
  const pendingScrollRestoreRef = useRef<{ prevHeight: number; prevTop: number } | null>(null)
  const shouldAutoScrollToBottomRef = useRef(true)
  const streamRunTokenRef = useRef(0)
  const copyFeedbackTimerRef = useRef<number | null>(null)
  const scrollToBottomAnimationRafRef = useRef<number | null>(null)
  const isProgrammaticScrollToBottomRef = useRef(false)
  const streamStatusSwitchTimerRef = useRef<number | null>(null)
  const pendingStreamStatusRef = useRef<{ phase: MessageStreamPhaseType; text: string } | null>(null)
  const lastStreamStatusAtRef = useRef(0)

  const createMessageMutation = useMutation({
    mutationFn: createChatMessage,
  })
  const abortStreamMutation = useMutation({
    mutationFn: abortChatStream,
  })

  const messagesQuery = useInfiniteQuery({
    queryKey: ['chat-messages', notebookId],
    enabled: Boolean(notebookId),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      listChatMessages({
        chat_id: notebookId,
        cursor: typeof pageParam === 'number' ? pageParam : 0,
        limit: chatMessagesPageLimit,
      }),
    getNextPageParam: (lastPage) => (lastPage.has_more ? lastPage.next_cursor : undefined),
  })

  const historyMessages = useMemo(() => {
    const pages = messagesQuery.data?.pages ?? []
    return pages
      .slice()
      .reverse()
      .flatMap((page) => page.messages.slice().reverse())
      .map(mapChatItemToUiMessage)
  }, [messagesQuery.data?.pages])

  const displayMessages = useMemo(
    () => [...historyMessages, ...liveMessages],
    [historyMessages, liveMessages],
  )

  const isStreaming = Boolean(activeTaskId)

  const scrollToBottom = useCallback(() => {
    const container = messageListRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
    setShowScrollToBottomButton(false)
  }, [])

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
  }, [])

  const smoothScrollToBottom = useCallback(() => {
    const container = messageListRef.current
    if (!container) return

    const startTop = container.scrollTop
    const targetTop = Math.max(container.scrollHeight - container.clientHeight, 0)
    const delta = targetTop - startTop
    if (Math.abs(delta) < 1) {
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
  }, [stopScrollToBottomAnimation, syncScrollToBottomButtonVisibility])

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
    [],
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

  const refreshHistoryAfterStream = useCallback(async () => {
    const result = await messagesQuery.refetch()
    if (result.error) {
      setErrorText(getErrorMessage(result.error))
      return
    }
    setLiveMessages([])
    scrollToBottom()
  }, [messagesQuery, scrollToBottom])

  useEffect(() => {
    return () => {
      if (copyFeedbackTimerRef.current !== null) {
        window.clearTimeout(copyFeedbackTimerRef.current)
        copyFeedbackTimerRef.current = null
      }
      clearStreamStatusSchedule()
      stopScrollToBottomAnimation()
    }
  }, [clearStreamStatusSchedule, stopScrollToBottomAnimation])

  useEffect(() => {
    streamRunTokenRef.current += 1
    streamAbortControllerRef.current?.abort()
    streamAbortControllerRef.current = null
    abortRequestedRef.current = false
    pendingScrollRestoreRef.current = null
    shouldAutoScrollToBottomRef.current = true
    stopScrollToBottomAnimation()
    clearStreamStatusSchedule()
    lastStreamStatusAtRef.current = 0
    setComposerValue('')
    setLiveMessages([])
    setStreamStatus('')
    setStreamPhaseType(null)
    setErrorText('')
    setActiveTaskId(null)
    setActiveAssistantMessageId(null)
    setCopiedUserMessageId(null)
    setShowScrollToBottomButton(false)
    if (copyFeedbackTimerRef.current !== null) {
      window.clearTimeout(copyFeedbackTimerRef.current)
      copyFeedbackTimerRef.current = null
    }
  }, [clearStreamStatusSchedule, notebookId, stopScrollToBottomAnimation])

  useLayoutEffect(() => {
    if (messagesQuery.isFetchingNextPage) return
    const pending = pendingScrollRestoreRef.current
    const container = messageListRef.current
    if (!pending || !container) return

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

  const appendAssistantChunk = useCallback(
    (assistantMessageId: string, contentChunk: string) => {
      setLiveMessages((prev) =>
        prev.map((message) =>
          message.id === assistantMessageId
            ? { ...message, text: `${message.text}${contentChunk}` }
            : message,
        ),
      )

      const container = messageListRef.current
      if (!container) return

      const distanceToBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight
      if (distanceToBottom < 120) {
        container.scrollTop = container.scrollHeight
      }
    },
    [],
  )

  const runStreamSession = useCallback(
    async (taskId: string, assistantMessageId: string) => {
      const runToken = ++streamRunTokenRef.current
      let lastStreamId = ''
      let reconnectCount = 0
      let finished = false

      setActiveTaskId(taskId)
      clearStreamStatusSchedule()
      applyStreamStatusImmediately(null, '')
      abortRequestedRef.current = false

      while (runToken === streamRunTokenRef.current) {
        try {
          const controller = new AbortController()
          streamAbortControllerRef.current = controller

          await streamChatEvents({
            chat_id: notebookId,
            task_id: taskId,
            last_stream_id: lastStreamId || undefined,
            signal: controller.signal,
            onEvent: (eventType, event) => {
              if (runToken !== streamRunTokenRef.current) return
              if (event.stream_id) {
                lastStreamId = event.stream_id
              }
              if (eventType === 'heartbeat' || event.heartbeat) {
                return
              }

              const phase = event.phase
              if (phase?.type === 'retrieving') {
                queueStreamStatus('retrieving', '正在检索来源...')
              } else if (phase?.type === 'thinking') {
                queueStreamStatus('thinking', '正在思考...')
              } else if (phase?.type === 'answer') {
                clearStreamStatusSchedule()
                setStreamPhaseType('answer')
                setStreamStatus('')
                if (phase.content) {
                  appendAssistantChunk(assistantMessageId, phase.content)
                }
              }

              if (event.finished) {
                finished = true
                clearStreamStatusSchedule()
                setStreamPhaseType('answer')
                setStreamStatus('')
              }
            },
          })

          if (abortRequestedRef.current || finished) {
            break
          }

          if (reconnectCount >= 1) {
            setErrorText('流式连接中断，请稍后重试。')
            break
          }
          reconnectCount += 1
          clearStreamStatusSchedule()
          applyStreamStatusImmediately(null, '')
          await sleep(streamReconnectDelayMs)
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            break
          }
          if (abortRequestedRef.current) {
            break
          }
          if (reconnectCount >= 1) {
            setErrorText(getErrorMessage(error))
            break
          }
          reconnectCount += 1
          clearStreamStatusSchedule()
          applyStreamStatusImmediately(null, '')
          await sleep(streamReconnectDelayMs)
        }
      }

      if (runToken !== streamRunTokenRef.current) {
        return
      }

      setActiveTaskId(null)
      setActiveAssistantMessageId(null)
      clearStreamStatusSchedule()
      setStreamStatus('')
      setStreamPhaseType(null)
      lastStreamStatusAtRef.current = 0
      streamAbortControllerRef.current = null
      abortRequestedRef.current = false
      await refreshHistoryAfterStream()
    },
    [
      appendAssistantChunk,
      applyStreamStatusImmediately,
      clearStreamStatusSchedule,
      notebookId,
      queueStreamStatus,
      refreshHistoryAfterStream,
    ],
  )

  const handleSendMessage = useCallback(async () => {
    if (!notebookId) return
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
      { id: userMessageId, role: 'user', text: prompt },
      { id: assistantMessageId, role: 'assistant', text: '' },
    ])
    window.requestAnimationFrame(() => {
      scrollToBottom()
    })

    try {
      const created = await createMessageMutation.mutateAsync({
        notebook_id: notebookId,
        prompt,
        source_ids: selectedSourceIds,
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
    isStreaming,
    notebookId,
    runStreamSession,
    scrollToBottom,
    selectedSourceIds,
  ])

  const handleAbortStream = useCallback(async () => {
    if (!notebookId || !activeTaskId) return
    if (abortStreamMutation.isPending) return

    setErrorText('')
    setStreamStatus('正在终止...')
    abortRequestedRef.current = true

    try {
      await abortStreamMutation.mutateAsync({
        chat_id: notebookId,
        task_id: activeTaskId,
      })
    } catch (error) {
      setErrorText(getErrorMessage(error))
    } finally {
      streamAbortControllerRef.current?.abort()
    }
  }, [abortStreamMutation, activeTaskId, notebookId])

  const handleCopyUserMessage = useCallback(
    async (messageId: string, text: string) => {
      const normalized = text.trim()
      if (!normalized) return

      try {
        await writeTextWithFallback(normalized)
        setCopiedUserMessageId(messageId)
        if (copyFeedbackTimerRef.current !== null) {
          window.clearTimeout(copyFeedbackTimerRef.current)
        }
        copyFeedbackTimerRef.current = window.setTimeout(() => {
          setCopiedUserMessageId((prev) => (prev === messageId ? null : prev))
          copyFeedbackTimerRef.current = null
        }, 1500)
      } catch {
        setErrorText('复制失败，请手动复制。')
      }
    },
    [],
  )

  const handleCopyUserMessageWithoutAwait = useCallback(
    (messageId: string, text: string) => {
      void handleCopyUserMessage(messageId, text)
    },
    [handleCopyUserMessage],
  )

  const handleMessageListScroll = useCallback(() => {
    const container = messageListRef.current
    if (!container) return

    if (isProgrammaticScrollToBottomRef.current) {
      return
    }
    syncScrollToBottomButtonVisibility()

    if (
      container.scrollTop > scrollLoadTopThresholdPx ||
      !messagesQuery.hasNextPage ||
      messagesQuery.isFetchingNextPage ||
      messagesQuery.isLoading
    ) {
      return
    }

    pendingScrollRestoreRef.current = {
      prevHeight: container.scrollHeight,
      prevTop: container.scrollTop,
    }
    shouldAutoScrollToBottomRef.current = false
    void messagesQuery.fetchNextPage()
  }, [
    messagesQuery.fetchNextPage,
    messagesQuery.hasNextPage,
    messagesQuery.isFetchingNextPage,
    messagesQuery.isLoading,
    syncScrollToBottomButtonVisibility,
  ])

  const handleComposerKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.key !== 'Enter' || event.shiftKey) {
      return
    }
    event.preventDefault()
    void handleSendMessage()
  }

  const submitDisabled =
    !composerValue.trim() ||
    isStreaming ||
    createMessageMutation.isPending ||
    !notebookId
  const showStreamStatus = Boolean(
    isStreaming &&
    streamStatus &&
    (streamPhaseType === 'retrieving' || streamPhaseType === 'thinking'),
  )
  const showStreamFlowAnimation = Boolean(
    isStreaming && (streamPhaseType === 'retrieving' || streamPhaseType === 'thinking'),
  )

  return (
    <Paper
      variant="outlined"
      sx={{ px: 4.5, py: 2, height: '100%', minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {sourcesPanelCollapsed && (
        <IconButton
          size="small"
          color="default"
          aria-label="展开来源面板"
          onClick={onExpandSourcesPanel}
          sx={{
            position: 'absolute',
            left: -18,
            top: 18,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            zIndex: 1,
            '&:hover': { bgcolor: 'background.default' },
          }}
        >
          <KeyboardDoubleArrowRightIcon fontSize="small" />
        </IconButton>
      )}
      {insightsPanelCollapsed && (
        <IconButton
          size="small"
          color="default"
          aria-label="展开右侧面板"
          onClick={onExpandInsightsPanel}
          sx={{
            position: 'absolute',
            right: -18,
            top: 18,
            display: { xs: 'none', md: 'inline-flex' },
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            zIndex: 1,
            '&:hover': { bgcolor: 'background.default' },
          }}
        >
          <KeyboardDoubleArrowLeftIcon fontSize="small" />
        </IconButton>
      )}
      <Stack spacing={0.5}>
        <Typography variant={panelTitleVariant} sx={panelTitleSx}>
          对话
        </Typography>
      </Stack>

      <ChatMessagesList
        messageListRef={messageListRef}
        messages={displayMessages}
        streamStatus={showStreamStatus ? streamStatus : ''}
        showStreamFlowAnimation={showStreamFlowAnimation}
        isLoadingHistory={messagesQuery.isLoading}
        isFetchingMore={messagesQuery.isFetchingNextPage}
        isStreaming={isStreaming}
        activeAssistantMessageId={activeAssistantMessageId}
        copiedUserMessageId={copiedUserMessageId}
        onScrollTopCheck={handleMessageListScroll}
        onCopyUserMessage={handleCopyUserMessageWithoutAwait}
      />

      {errorText ? (
        <Typography variant="caption" color="error.main" sx={{ mt: 1 }}>
          {errorText}
        </Typography>
      ) : null}

      <Box sx={{ position: 'relative' }}>
        {showScrollToBottomButton ? (
          <IconButton
            size="small"
            aria-label="回到底部"
            onClick={smoothScrollToBottom}
            sx={{
              position: 'absolute',
              right: `${scrollToBottomButtonTokens.rightPx}px`,
              bottom: `calc(100% + ${scrollToBottomButtonTokens.marginBottom * 8}px)`,
              width: scrollToBottomButtonTokens.size,
              height: scrollToBottomButtonTokens.size,
              border: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.12)',
              zIndex: 2,
              '&:hover': {
                bgcolor: 'background.default',
              },
            }}
          >
            <ArrowDownwardIcon fontSize="small" />
          </IconButton>
        ) : null}

        <ChatComposer
          value={composerValue}
          isStreaming={isStreaming}
          isInputDisabled={!notebookId || isStreaming}
          isSubmitDisabled={submitDisabled}
          isAbortDisabled={abortStreamMutation.isPending || !activeTaskId}
          onValueChange={setComposerValue}
          onKeyDown={handleComposerKeyDown}
          onSend={() => {
            void handleSendMessage()
          }}
          onAbort={() => {
            void handleAbortStream()
          }}
        />
      </Box>
    </Paper>
  )
}
