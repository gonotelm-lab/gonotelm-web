import { ApiError } from '@/lib/http'
import type {
  ChatMessageCitation,
  ChatMessageListItem,
  ChatMessageStreamCitation,
  MessageStreamPhaseContentAction,
} from '@/types/api'
import type { ChatUiCitationDetail, ChatUiMessage } from './types'

export const chatMessagesPageLimit = 20
export const scrollLoadTopThresholdPx = 260
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

export const toCitationDetailsFromMessageCitation = (
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
