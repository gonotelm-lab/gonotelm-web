import i18n from '@/i18n'
import { apiErrorMessage } from '@/lib/apiErrorMessage'
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
/** Slightly coarser than 1 frame: fewer markdown re-parses while still feeling live. */
export const streamUiFlushIntervalMs = 120
export const smoothScrollDeltaEpsilonPx = 1

interface ChatScrollMetrics {
  scrollHeight: number
  scrollTop: number
  clientHeight: number
}

interface ChatStickScrollContainer {
  scrollHeight: number
  scrollTop: number
}

export const isNearBottom = (
  metrics: ChatScrollMetrics,
  thresholdPx = streamAutoScrollThresholdPx,
) => metrics.scrollHeight - metrics.scrollTop - metrics.clientHeight < thresholdPx

export const applyStickToBottomScroll = (
  container: ChatStickScrollContainer | null | undefined,
  shouldStick: boolean,
) => {
  if (!container || !shouldStick) {
    return false
  }
  container.scrollTop = container.scrollHeight
  return true
}

export const resolveMessageItemContentVisibility = (
  isLastMessage: boolean,
): 'auto' | undefined => (isLastMessage ? undefined : 'auto')

/** 服务端流式任务的终止事件：done=true 或 error 非空 */
export const isStreamTerminalEvent = (event: StreamTaskEvent) =>
  event.done === true || Boolean(event.error?.message)

/** 结构类事件需要立刻刷新 UI，避免 phase/fragment 切换滞后。 */
export const shouldFlushStreamEventImmediately = (event: StreamTaskEvent) =>
  event.op !== 'APPEND'

/** 回答正文增量需要按帧刷新，才能呈现流式输出效果。 */
export const shouldFlushStreamEventOnNextFrame = (event: StreamTaskEvent) =>
  event.op === 'APPEND' && event.p === 'm.f.rsp.v'
/** 流式会话正常完成（收到终止事件且未被用户中止）时才应触发后续动作 */
export const shouldFireStreamCompleted = (finished: boolean, aborted: boolean): boolean =>
  finished && !aborted
export const copyFeedbackVisibleMs = 1500

export type StreamDisplayPhaseType = 'phase' | null

export const getErrorMessage = (error: unknown) =>
  apiErrorMessage(error, 'common:error.requestFailed')

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
  isSummary ? i18n.t('chat:citation.typeSummary') : i18n.t('chat:citation.typeOriginal')

export const formatCitationPositionText = (
  position: CitationPositionLike,
  isSummary?: boolean,
) => {
  const normalizedPosition = normalizeCitationPosition(position)
  if (!normalizedPosition) {
    return '-'
  }
  if (isSummary && normalizedPosition.start === 0 && normalizedPosition.end === 0) {
    return i18n.t('chat:citation.positionSummary')
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
