import type { ChatListMessagesResponse } from '@/types/api'
import { mapChatItemToUiMessage } from './chatConversationCommon'
import type { ChatUiMessage } from './types'

const normalizeMessageText = (value: string) => value.trim()

const hasAssistantTextInHistory = (
  historyMessages: ChatUiMessage[],
  assistantText: string,
) => {
  const normalizedAssistantText = normalizeMessageText(assistantText)
  if (!normalizedAssistantText) {
    return false
  }

  return historyMessages.some((message) => {
    if (message.role !== 'assistant') {
      return false
    }
    const normalizedHistoryText = normalizeMessageText(message.text)
    if (!normalizedHistoryText) {
      return false
    }
    // Use equals/contains heuristics because backend persistence may trim or chunk assistant content differently.
    return (
      normalizedHistoryText === normalizedAssistantText ||
      normalizedHistoryText.endsWith(normalizedAssistantText) ||
      normalizedAssistantText.endsWith(normalizedHistoryText)
    )
  })
}

/**
 * Normalizes paginated history payload into chronological UI messages.
 * API returns latest-first, but chat list expects oldest-first order.
 */
export const mapHistoryPagesToUiMessages = (pages: ChatListMessagesResponse[]) => {
  const messages: ChatUiMessage[] = []
  // API pages and message arrays are newest-first; UI list renders oldest-first for chat chronology.
  for (let pageIndex = pages.length - 1; pageIndex >= 0; pageIndex -= 1) {
    const pageMessages = pages[pageIndex]?.messages ?? []
    for (let messageIndex = pageMessages.length - 1; messageIndex >= 0; messageIndex -= 1) {
      const item = pageMessages[messageIndex]
      if (item) {
        messages.push(mapChatItemToUiMessage(item))
      }
    }
  }
  return messages
}

/**
 * Preserves the latest local assistant draft after abort if it was not
 * already persisted in refreshed server history.
 */
export const buildLiveMessagesAfterAbortRefresh = (
  previousLiveMessages: ChatUiMessage[],
  fetchedHistoryMessages: ChatUiMessage[],
): ChatUiMessage[] => {
  const latestAssistantDraft = [...previousLiveMessages].reverse().find(
    (message) => message.role === 'assistant' && normalizeMessageText(message.text),
  )
  if (!latestAssistantDraft) {
    return []
  }

  if (hasAssistantTextInHistory(fetchedHistoryMessages, latestAssistantDraft.text)) {
    // If server history already contains this content, do not keep a duplicate local draft bubble.
    return []
  }

  return [latestAssistantDraft]
}
