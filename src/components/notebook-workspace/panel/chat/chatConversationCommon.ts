import { ApiError } from '@/lib/http'
import type {
  ChatMessageCitation,
  ChatMessageListItem,
  ChatMessageStreamCitation,
  ChatMessageStreamCitationDocPosition,
  MessageStreamPhaseContentAction,
  SourceDocPosition,
} from '@/types/api'
import type { ChatUiCitationDetail, ChatUiCitationPosition, ChatUiMessage } from './types'

export const chatMessagesPageLimit = 20
export const showScrollToBottomButtonThresholdPx = 80
export const scrollToBottomAnimationDurationMs = 460
export const streamReconnectDelayMs = 600
export const streamStatusMinVisibleMs = 900
export const streamChunkFlushIntervalMs = 28
export const streamChunkImmediateFlushSize = 96
export const streamAutoScrollThresholdPx = 42
export const streamReconnectMaxRetries = 1
export const smoothScrollDeltaEpsilonPx = 1
export const copyFeedbackVisibleMs = 1500

export const getErrorMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return '请求失败，请稍后重试。'
}

export const getFinishReasonNotice = (finishReason?: string) => {
  if (finishReason === 'length') {
    return '回答达到长度上限，内容可能被截断，可继续追问。'
  }
  if (finishReason === 'content_filter') {
    return '回答触发内容安全过滤，部分内容被拦截。'
  }
  return ''
}

export const resolveStreamContentAction = (
  action?: MessageStreamPhaseContentAction,
): MessageStreamPhaseContentAction => {
  if (action === 'override') {
    return 'override'
  }
  return 'continue'
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

type CitationPositionLike = ChatMessageStreamCitationDocPosition | SourceDocPosition | null | undefined

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

const toCitationDetailsFromMessageCitation = (
  citation?: ChatMessageCitation,
): ChatUiCitationDetail[] => {
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

export const toCitationDetailsFromStreamCitation = (
  citation?: ChatMessageStreamCitation,
): ChatUiCitationDetail[] => {
  if (!citation || citation.length === 0) {
    return []
  }

  const citationDetails: ChatUiCitationDetail[] = []
  citation.forEach((citationItem, sourceIndex) => {
    const sourceId = citationItem.source_id
    ;(citationItem.docs ?? []).forEach((doc, docIndex) => {
      const normalizedPosition = normalizeCitationPosition(doc.position)
      citationDetails.push({
        marker: `[[${sourceIndex}#${docIndex}]]`,
        sourceIndex,
        docIndex,
        sourceId,
        docId: doc.id,
        isSummary: Boolean(doc.is_summary),
        position: normalizedPosition ?? undefined,
      })
    })
  })

  return citationDetails
}

export const mergeDistinctCitationDetails = (
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

export const mapChatItemToUiMessage = (message: ChatMessageListItem): ChatUiMessage => {
  const msgRole = String(message.role).toLowerCase()
  return {
    id: message.id,
    role: msgRole === 'user' ? 'user' : 'assistant',
    text: message.content?.text?.content ?? '',
    citationDetails: toCitationDetailsFromMessageCitation(message.citation),
  }
}
