import type { ChatListMessagesResponse } from '@/types/api'
import { mapChatMessageToUi } from './messageMapper'
import { extractResponseText } from './streamEventReducer'
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
    const normalizedHistoryText = normalizeMessageText(extractResponseText(message))
    if (!normalizedHistoryText) {
      return false
    }
    return (
      normalizedHistoryText === normalizedAssistantText ||
      normalizedHistoryText.endsWith(normalizedAssistantText) ||
      normalizedAssistantText.endsWith(normalizedHistoryText)
    )
  })
}

export const mapHistoryPagesToUiMessages = (pages: ChatListMessagesResponse[]) => {
  const messages: ChatUiMessage[] = []
  for (let pageIndex = pages.length - 1; pageIndex >= 0; pageIndex -= 1) {
    const pageMessages = pages[pageIndex]?.messages ?? []
    for (let messageIndex = pageMessages.length - 1; messageIndex >= 0; messageIndex -= 1) {
      const item = pageMessages[messageIndex]
      if (item) {
        messages.push(mapChatMessageToUi(item))
      }
    }
  }
  return messages
}

export const buildLiveMessagesAfterAbortRefresh = (
  previousLiveMessages: ChatUiMessage[],
  fetchedHistoryMessages: ChatUiMessage[],
): ChatUiMessage[] => {
  const latestAssistantDraft = [...previousLiveMessages].reverse().find(
    (message) => message.role === 'assistant' && normalizeMessageText(extractResponseText(message)),
  )
  if (!latestAssistantDraft) {
    return []
  }

  if (hasAssistantTextInHistory(fetchedHistoryMessages, extractResponseText(latestAssistantDraft))) {
    return []
  }

  return [latestAssistantDraft]
}
