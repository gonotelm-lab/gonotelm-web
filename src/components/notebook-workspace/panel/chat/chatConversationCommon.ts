import { ApiError } from '@/lib/http'
import type { SourceDocPosition, StreamTaskEvent } from '@/types/api'
import type {
  ChatCitationJumpRequest,
  ChatUiCitationPosition,
} from './types'

export const chatMessagesPageLimit = 20
export const showScrollToBottomButtonThresholdPx = 80
export const scrollToBottomAnimationDurationMs = 460
export const streamReconnectDelayMs = 600
export const streamStatusMinVisibleMs = 900
export const streamAutoScrollThresholdPx = 42
export const streamReconnectMaxRetries = 1
export const streamUiFlushIntervalMs = 80
export const smoothScrollDeltaEpsilonPx = 1

/** 服务端流式任务的终止事件：done=true 或 error 非空 */
export const isStreamTerminalEvent = (event: StreamTaskEvent) =>
  event.done === true || Boolean(event.error?.message)
export const copyFeedbackVisibleMs = 1500

export type StreamDisplayPhaseType = 'phase' | null

export const getErrorMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return '请求失败，请稍后重试。'
}

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })

export const writeTextWithFallback = async (text: string) => {
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

type CitationPositionLike = ChatUiCitationPosition | SourceDocPosition | null | undefined

const readCitationPositionBoundary = (
  position: CitationPositionLike,
  fieldKey: 'start' | 'end',
): number | null => {
  if (!position) {
    return null
  }

  const rawValue = (position as Record<string, unknown>)[fieldKey]
  if (typeof rawValue !== 'number' || Number.isNaN(rawValue)) {
    return null
  }
  return rawValue
}

const readCitationByteBoundary = (
  position: CitationPositionLike,
  fieldKey: 'bytes_start' | 'bytes_end',
): number | null => {
  if (!position) {
    return null
  }

  const rawValue = (position as Record<string, unknown>)[fieldKey]
  if (typeof rawValue !== 'number' || Number.isNaN(rawValue)) {
    return null
  }
  return rawValue
}

export const normalizeCitationPosition = (
  position: CitationPositionLike,
): ChatUiCitationPosition | null => {
  const start = readCitationPositionBoundary(position, 'start')
  const end = readCitationPositionBoundary(position, 'end')
  if (start === null || end === null) {
    return null
  }
  const bytesStart = readCitationByteBoundary(position, 'bytes_start')
  const bytesEnd = readCitationByteBoundary(position, 'bytes_end')
  return {
    start,
    end,
    ...(bytesStart === null ? {} : { bytesStart }),
    ...(bytesEnd === null ? {} : { bytesEnd }),
  }
}

export const isSummaryCitationPosition = (position: ChatUiCitationPosition | null) =>
  !position || (position.start === 0 && position.end === 0)

export const resolveCitationTypeLabel = (isSummary?: boolean) =>
  isSummary ? '总结性引用' : '原文片段引用'

export const formatCitationPositionText = (
  position: CitationPositionLike,
  isSummary?: boolean,
) => {
  const normalizedPosition = normalizeCitationPosition(position)
  if (!normalizedPosition) {
    return '-'
  }
  if (isSummary && normalizedPosition.start === 0 && normalizedPosition.end === 0) {
    return '无原文定位（总结性引用）'
  }
  return `${normalizedPosition.start} - ${normalizedPosition.end}`
}

interface CitationJumpButtonVisibilityInput {
  onOpenCitationJump?: (request: ChatCitationJumpRequest) => void
  sourceId?: string
  position?: ChatUiCitationPosition | null
  isOriginalCitation: boolean
}

export const canShowCitationJumpButton = ({
  onOpenCitationJump,
  sourceId,
  position,
  isOriginalCitation,
}: CitationJumpButtonVisibilityInput) =>
  Boolean(onOpenCitationJump && sourceId && position && isOriginalCitation)
