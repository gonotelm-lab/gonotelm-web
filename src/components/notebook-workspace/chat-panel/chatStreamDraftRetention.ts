import type { ChatListMessagesResponse } from '../../../types/api'
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
    return (
      normalizedHistoryText === normalizedAssistantText ||
      normalizedHistoryText.endsWith(normalizedAssistantText) ||
      normalizedAssistantText.endsWith(normalizedHistoryText)
    )
  })
}

export const mapHistoryPagesToUiMessages = (pages: ChatListMessagesResponse[]) =>
  pages
    .slice()
    .reverse()
    .flatMap((page) => page.messages.slice().reverse())
    .map(mapChatItemToUiMessage)

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
    return []
  }

  return [latestAssistantDraft]
}
