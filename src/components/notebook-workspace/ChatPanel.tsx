import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft'
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import TuneRoundedIcon from '@mui/icons-material/TuneRounded'
import {
  Button,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { useInfiniteQuery, useMutation } from '@tanstack/react-query'
import {
  abortChatStream,
  createChatMessage,
  deleteChatContext,
  listChatMessages,
  streamChatEvents,
} from '../../api/chat'
import { ApiError } from '../../lib/http'
import type {
  ChatMessageCitation,
  ChatMessageListItem,
  ChatMessageStreamCitation,
  MessageStreamPhaseContentAction,
  MessageStreamPhaseType,
} from '../../types/api'
import { panelTitleSx, panelTitleVariant } from './panelStyles'
import { ChatComposer } from './chat-panel/ChatComposer'
import { ChatMessagesList } from './chat-panel/ChatMessagesList'
import type { ChatUiCitationDetail, ChatUiMessage } from './chat-panel/types'

const chatMessagesPageLimit = 20
const scrollLoadTopThresholdPx = 260
const showScrollToBottomButtonThresholdPx = 80
const scrollToBottomAnimationDurationMs = 460
const streamReconnectDelayMs = 600
const streamStatusMinVisibleMs = 900
const streamChunkFlushIntervalMs = 28
const streamChunkImmediateFlushSize = 96
const streamAutoScrollThresholdPx = 42
const streamReconnectMaxRetries = 1
const smoothScrollDeltaEpsilonPx = 1
const copyFeedbackVisibleMs = 1500
const chatPanelLeftPadding = 3
const chatPanelRightContentPadding = 2.75
const chatPanelRightContentPaddingPx = chatPanelRightContentPadding * 8
const chatPanelVerticalPadding = 2
const chatHeaderStackSpacing = 0.5
const scrollToBottomButtonTokens = {
  size: 32,
  rightPx: 7.8,
  marginBottom: 1.15,
  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.12)',
  zIndex: 2,
}
const sidePanelToggleButtonTokens = {
  horizontalOffset: -18,
  topOffset: 18,
  zIndex: 1,
}

type ChatStyleOption = 'default' | 'analyst' | 'guide' | 'custom'
type ChatAnswerLengthOption = 'default' | 'longer' | 'shorter'

const chatStyleOptionList: { value: ChatStyleOption; label: string }[] = [
  { value: 'default', label: '默认' },
  { value: 'analyst', label: '分析师' },
  { value: 'guide', label: '向导' },
  { value: 'custom', label: '自定义' },
]

const chatAnswerLengthOptionList: { value: ChatAnswerLengthOption; label: string }[] = [
  { value: 'default', label: '默认' },
  { value: 'longer', label: '更长' },
  { value: 'shorter', label: '更短' },
]

const settingsToggleButtonSx = {
  minWidth: 72,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 999,
  margin: 0,
  px: 1.25,
  py: 0.35,
  textTransform: 'none',
  fontSize: 12.5,
  '&.MuiToggleButtonGroup-grouped': {
    borderRadius: '999px !important',
    margin: 0,
  },
  '&.MuiToggleButtonGroup-grouped:not(:first-of-type)': {
    borderLeft: '1px solid',
    borderColor: 'divider',
  },
  '&.Mui-selected': {
    bgcolor: 'primary.main',
    color: 'primary.contrastText',
    borderColor: 'primary.main',
    '&:hover': {
      bgcolor: 'primary.dark',
    },
  },
}

interface ChatPanelProps {
  notebookId: string
  chatId: string
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

const getFinishReasonNotice = (finishReason?: string) => {
  if (finishReason === 'length') {
    return '回答达到长度上限，内容可能被截断，可继续追问。'
  }
  if (finishReason === 'content_filter') {
    return '回答触发内容安全过滤，部分内容被拦截。'
  }
  return ''
}

const resolveStreamContentAction = (
  action?: MessageStreamPhaseContentAction,
): MessageStreamPhaseContentAction => {
  if (action === 'override') {
    return 'override'
  }
  return 'continue'
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

const toCitationDetailsFromMessageCitation = (citation?: ChatMessageCitation): ChatUiCitationDetail[] => {
  if (!citation || citation.length === 0) {
    return []
  }

  const citationDetails: ChatUiCitationDetail[] = []
  citation.forEach((citationItem, sourceIndex) => {
    const sourceId = citationItem.source_id
    ;(citationItem.doc_ids ?? []).forEach((docId, docIndex) => {
      citationDetails.push({
        marker: `[[${sourceIndex}#${docIndex}]]`,
        sourceIndex,
        docIndex,
        sourceId,
        docId,
      })
    })
  })

  return citationDetails
}

const toCitationDetailsFromStreamCitation = (citation?: ChatMessageStreamCitation): ChatUiCitationDetail[] => {
  if (!citation || citation.length === 0) {
    return []
  }

  const citationDetails: ChatUiCitationDetail[] = []
  citation.forEach((citationItem, sourceIndex) => {
    const sourceId = citationItem.source_id
    ;(citationItem.docs ?? []).forEach((doc, docIndex) => {
      citationDetails.push({
        marker: `[[${sourceIndex}#${docIndex}]]`,
        sourceIndex,
        docIndex,
        sourceId,
        docId: doc.id,
      })
    })
  })

  return citationDetails
}

const mergeDistinctCitationDetails = (
  current: ChatUiCitationDetail[] | undefined,
  incoming: ChatUiCitationDetail[],
) => {
  if (incoming.length === 0) {
    return current ?? []
  }

  const detailByMarker = new Map<string, ChatUiCitationDetail>()
  for (const citationDetail of current ?? []) {
    detailByMarker.set(citationDetail.marker, citationDetail)
  }
  for (const citationDetail of incoming) {
    detailByMarker.set(citationDetail.marker, citationDetail)
  }

  return Array.from(detailByMarker.values())
}

const mapChatItemToUiMessage = (message: ChatMessageListItem): ChatUiMessage => {
  const msgRole = String(message.role).toLowerCase()
  return {
    id: message.id,
    role: msgRole === 'user' ? 'user' : 'assistant',
    text: message.content?.text?.content ?? '',
    citationDetails: toCitationDetailsFromMessageCitation(message.citation),
  }
}

export function ChatPanel({
  notebookId,
  chatId,
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
  const [finishReasonNotice, setFinishReasonNotice] = useState('')
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [activeAssistantMessageId, setActiveAssistantMessageId] = useState<string | null>(null)
  const [copiedUserMessageId, setCopiedUserMessageId] = useState<string | null>(null)
  const [enableThinking, setEnableThinking] = useState(false)
  const [showScrollToBottomButton, setShowScrollToBottomButton] = useState(false)
  const [isClearingContext, setIsClearingContext] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [chatStyle, setChatStyle] = useState<ChatStyleOption>('default')
  const [answerLength, setAnswerLength] = useState<ChatAnswerLengthOption>('default')

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
  const pendingAssistantChunkRef = useRef('')
  const pendingAssistantChunkMessageIdRef = useRef<string | null>(null)
  const pendingAssistantChunkFlushTimerRef = useRef<number | null>(null)

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
  }, [stopScrollToBottomAnimation, syncScrollToBottomButtonVisibility])

  const clearStreamStatusSchedule = useCallback(() => {
    if (streamStatusSwitchTimerRef.current !== null) {
      window.clearTimeout(streamStatusSwitchTimerRef.current)
      streamStatusSwitchTimerRef.current = null
    }
    pendingStreamStatusRef.current = null
  }, [])

  const clearPendingAssistantChunkBuffer = useCallback(() => {
    if (pendingAssistantChunkFlushTimerRef.current !== null) {
      window.clearTimeout(pendingAssistantChunkFlushTimerRef.current)
      pendingAssistantChunkFlushTimerRef.current = null
    }
    pendingAssistantChunkRef.current = ''
    pendingAssistantChunkMessageIdRef.current = null
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
      clearPendingAssistantChunkBuffer()
    }
  }, [clearPendingAssistantChunkBuffer, clearStreamStatusSchedule, stopScrollToBottomAnimation])

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
    setSettingsDialogOpen(false)
    setComposerValue('')
    setLiveMessages([])
    setStreamStatus('')
    setStreamPhaseType(null)
    setErrorText('')
    setFinishReasonNotice('')
    setActiveTaskId(null)
    setActiveAssistantMessageId(null)
    setCopiedUserMessageId(null)
    setShowScrollToBottomButton(false)
    setIsClearingContext(false)
    clearPendingAssistantChunkBuffer()
    if (copyFeedbackTimerRef.current !== null) {
      window.clearTimeout(copyFeedbackTimerRef.current)
      copyFeedbackTimerRef.current = null
    }
  }, [clearPendingAssistantChunkBuffer, clearStreamStatusSchedule, notebookId, stopScrollToBottomAnimation])

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
      const container = messageListRef.current
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
    [],
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
    [],
  )

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

  const queueAssistantChunk = useCallback(
    (assistantMessageId: string, chunk: string) => {
      if (!chunk) {
        return
      }

      if (pendingAssistantChunkMessageIdRef.current !== assistantMessageId) {
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
            id: chatId,
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
              if (phase?.citation) {
                applyAssistantCitationDetails(
                  assistantMessageId,
                  toCitationDetailsFromStreamCitation(phase.citation),
                )
              }
              if (phase?.type === 'retrieving') {
                queueStreamStatus('retrieving', '正在检索来源...')
              } else if (phase?.type === 'thinking') {
                queueStreamStatus('thinking', '正在思考...')
              } else if (phase?.type === 'answer') {
                clearStreamStatusSchedule()
                setStreamPhaseType('answer')
                setStreamStatus('')
                const contentAction = resolveStreamContentAction(phase.action)
                if (contentAction === 'override') {
                  clearPendingAssistantChunkBuffer()
                  overrideAssistantContent(assistantMessageId, phase.content ?? '')
                } else if (phase.content) {
                  queueAssistantChunk(assistantMessageId, phase.content)
                }
              }

              if (event.finished) {
                flushPendingAssistantChunk()
                finished = true
                const notice = getFinishReasonNotice(event.finish_reason)
                if (notice) {
                  setFinishReasonNotice(notice)
                }
                clearStreamStatusSchedule()
                setStreamPhaseType('answer')
                setStreamStatus('')
              }
            },
          })

          if (abortRequestedRef.current || finished) {
            break
          }

          if (reconnectCount >= streamReconnectMaxRetries) {
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

      if (runToken !== streamRunTokenRef.current) {
        clearPendingAssistantChunkBuffer()
        return
      }

      flushPendingAssistantChunk()
      setActiveTaskId(null)
      setActiveAssistantMessageId(null)
      clearStreamStatusSchedule()
      setStreamStatus('')
      setStreamPhaseType(null)
      lastStreamStatusAtRef.current = 0
      streamAbortControllerRef.current = null
      abortRequestedRef.current = false
      clearPendingAssistantChunkBuffer()
      await refreshHistoryAfterStream()
    },
    [
      applyAssistantCitationDetails,
      applyStreamStatusImmediately,
      clearPendingAssistantChunkBuffer,
      clearStreamStatusSchedule,
      flushPendingAssistantChunk,
      chatId,
      overrideAssistantContent,
      queueAssistantChunk,
      queueStreamStatus,
      refreshHistoryAfterStream,
    ],
  )

  const handleSendMessage = useCallback(async () => {
    if (!chatId) return
    if (isStreaming || createMessageMutation.isPending) return

    const prompt = composerValue.trimEnd()
    if (!prompt.trim()) return

    setErrorText('')
    setFinishReasonNotice('')
    setComposerValue('')
    shouldAutoScrollToBottomRef.current = true

    const userMessageId = `local-user-${Date.now()}`
    const assistantMessageId = `local-assistant-${Date.now()}`
    setActiveAssistantMessageId(assistantMessageId)
    setLiveMessages((prev) => [
      ...prev,
      { id: userMessageId, role: 'user', text: prompt },
      { id: assistantMessageId, role: 'assistant', text: '', citationDetails: [] },
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
  ])

  const handleAbortStream = useCallback(async () => {
    if (!chatId || !activeTaskId) return
    if (abortStreamMutation.isPending) return

    setErrorText('')
    setFinishReasonNotice('')
    setStreamStatus('正在终止...')
    abortRequestedRef.current = true

    try {
      await abortStreamMutation.mutateAsync({
        id: chatId,
        task_id: activeTaskId,
      })
    } catch (error) {
      setErrorText(getErrorMessage(error))
    } finally {
      streamAbortControllerRef.current?.abort()
    }
  }, [abortStreamMutation, activeTaskId, chatId])

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
        }, copyFeedbackVisibleMs)
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

  const handleOpenSettingsDialog = useCallback(() => {
    setSettingsDialogOpen(true)
  }, [])

  const handleCloseSettingsDialog = useCallback(() => {
    setSettingsDialogOpen(false)
  }, [])

  const handleSaveSettings = useCallback(() => {
    setSettingsDialogOpen(false)
  }, [])

  const handleClearCurrentContext = useCallback(() => {
    const clearContext = async () => {
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
    setFinishReasonNotice('')
    void clearContext()
  }, [
    chatId,
    isClearingContext,
    isStreaming,
  ])

  const submitDisabled =
    !composerValue.trim() ||
    isStreaming ||
    createMessageMutation.isPending ||
    !chatId
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
      sx={{
        pl: chatPanelLeftPadding,
        pr: 0,
        py: chatPanelVerticalPadding,
        height: '100%',
        minHeight: 0,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {sourcesPanelCollapsed && (
        <IconButton
          size="small"
          color="default"
          aria-label="展开来源面板"
          onClick={onExpandSourcesPanel}
          sx={{
            position: 'absolute',
            left: sidePanelToggleButtonTokens.horizontalOffset,
            top: sidePanelToggleButtonTokens.topOffset,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            zIndex: sidePanelToggleButtonTokens.zIndex,
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
            right: sidePanelToggleButtonTokens.horizontalOffset,
            top: sidePanelToggleButtonTokens.topOffset,
            display: { xs: 'none', md: 'inline-flex' },
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            zIndex: sidePanelToggleButtonTokens.zIndex,
            '&:hover': { bgcolor: 'background.default' },
          }}
        >
          <KeyboardDoubleArrowLeftIcon fontSize="small" />
        </IconButton>
      )}
      <Stack
        direction="row"
        spacing={chatHeaderStackSpacing}
        sx={{
          pr: chatPanelRightContentPadding,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant={panelTitleVariant} sx={panelTitleSx}>
          对话
        </Typography>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshRoundedIcon className="chat-refresh-icon" sx={{ fontSize: 15 }} />}
            onClick={handleClearCurrentContext}
            disabled={!chatId || isClearingContext || isStreaming}
            sx={{
              minWidth: 0,
              height: 28,
              px: 1,
              py: 0.25,
              borderRadius: 999,
              textTransform: 'none',
              fontSize: 12.5,
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              '& .chat-refresh-icon': {
                transformOrigin: 'center',
                animation: isClearingContext ? 'chat-refresh-spin 0.9s linear infinite' : 'none',
              },
              '@keyframes chat-refresh-spin': {
                from: { transform: 'rotate(0deg)' },
                to: { transform: 'rotate(360deg)' },
              },
            }}
          >
            刷新
          </Button>
          <IconButton
            size="small"
            aria-label="打开对话设置"
            onClick={handleOpenSettingsDialog}
          >
            <TuneRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>

      <ChatMessagesList
        messageListRef={messageListRef}
        messages={displayMessages}
        streamStatus={showStreamStatus ? streamStatus : ''}
        streamPhaseType={showStreamStatus ? streamPhaseType : null}
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
        <Typography
          variant="caption"
          color="error.main"
          sx={{ mt: 1, pr: chatPanelRightContentPadding }}
        >
          {errorText}
        </Typography>
      ) : finishReasonNotice ? (
        <Typography
          variant="caption"
          color="warning.main"
          sx={{ mt: 1, pr: chatPanelRightContentPadding }}
        >
          {finishReasonNotice}
        </Typography>
      ) : null}

      <Box sx={{ position: 'relative', pr: chatPanelRightContentPadding }}>
        {showScrollToBottomButton ? (
          <IconButton
            size="small"
            aria-label="回到底部"
            onClick={smoothScrollToBottom}
            sx={{
              position: 'absolute',
              right: `${scrollToBottomButtonTokens.rightPx + chatPanelRightContentPaddingPx}px`,
              bottom: `calc(100% + ${scrollToBottomButtonTokens.marginBottom * 8}px)`,
              width: scrollToBottomButtonTokens.size,
              height: scrollToBottomButtonTokens.size,
              border: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              boxShadow: scrollToBottomButtonTokens.boxShadow,
              zIndex: scrollToBottomButtonTokens.zIndex,
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
          isInputDisabled={!chatId || isStreaming}
          isSubmitDisabled={submitDisabled}
          isAbortDisabled={abortStreamMutation.isPending || !activeTaskId}
          enableThinking={enableThinking}
          isThinkingToggleDisabled={isStreaming || createMessageMutation.isPending}
          onValueChange={setComposerValue}
          onThinkingToggle={setEnableThinking}
          onKeyDown={handleComposerKeyDown}
          onSend={() => {
            void handleSendMessage()
          }}
          onAbort={() => {
            void handleAbortStream()
          }}
        />
      </Box>

      <Dialog
        open={settingsDialogOpen}
        onClose={handleCloseSettingsDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>对话设置</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.25}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                对话风格
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                控制回答语气与组织方式。
              </Typography>
              <ToggleButtonGroup
                exclusive
                value={chatStyle}
                onChange={(_, nextValue: ChatStyleOption | null) => {
                  if (nextValue) {
                    setChatStyle(nextValue)
                  }
                }}
                sx={{ mt: 1.25, flexWrap: 'wrap', gap: 0.75, border: 'none' }}
              >
                {chatStyleOptionList.map((option) => (
                  <ToggleButton
                    key={option.value}
                    value={option.value}
                    sx={settingsToggleButtonSx}
                  >
                    {option.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
            <Divider />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                回答长度
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                控制回答的详略程度。
              </Typography>
              <ToggleButtonGroup
                exclusive
                value={answerLength}
                onChange={(_, nextValue: ChatAnswerLengthOption | null) => {
                  if (nextValue) {
                    setAnswerLength(nextValue)
                  }
                }}
                sx={{ mt: 1.25, flexWrap: 'wrap', gap: 0.75, border: 'none' }}
              >
                {chatAnswerLengthOptionList.map((option) => (
                  <ToggleButton
                    key={option.value}
                    value={option.value}
                    sx={settingsToggleButtonSx}
                  >
                    {option.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSettingsDialog}>取消</Button>
          <Button variant="contained" onClick={handleSaveSettings}>
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
