import { describe, expect, it } from 'vitest'
import type { ChatListMessagesResponse, ChatMessageListItem } from '@/types/api'
import type { ChatUiMessage } from './types'
import {
  buildLiveMessagesAfterAbortRefresh,
  mapHistoryPagesToUiMessages,
} from './chatStreamDraftRetention'

const makeHistoryMessage = (
  id: string,
  role: 'user' | 'assistant',
  text: string,
): ChatMessageListItem => ({
  id,
  chat_id: 'chat-1',
  role,
  content: {
    created_at: 0,
    kind: 'text',
    text: { content: text },
  },
})

const makePage = (messages: ChatMessageListItem[]): ChatListMessagesResponse => ({
  messages,
  limit: 20,
  has_more: false,
  next_cursor: 0,
})

describe('mapHistoryPagesToUiMessages', () => {
  it('converts paged history into chronological ui messages', () => {
    const newestPage = makePage([
      makeHistoryMessage('m4', 'assistant', 'answer 2'),
      makeHistoryMessage('m3', 'user', 'question 2'),
    ])
    const olderPage = makePage([
      makeHistoryMessage('m2', 'assistant', 'answer 1'),
      makeHistoryMessage('m1', 'user', 'question 1'),
    ])

    const result = mapHistoryPagesToUiMessages([newestPage, olderPage])

    expect(result.map((message) => message.id)).toEqual(['m1', 'm2', 'm3', 'm4'])
  })
})

describe('buildLiveMessagesAfterAbortRefresh', () => {
  it('keeps latest assistant draft when history does not include it', () => {
    const previousLiveMessages: ChatUiMessage[] = [
      { id: 'u-local', role: 'user', text: 'question' },
      { id: 'a-local', role: 'assistant', text: 'partial answer' },
    ]
    const fetchedHistoryMessages: ChatUiMessage[] = [
      { id: 'u-server', role: 'user', text: 'question' },
    ]

    const result = buildLiveMessagesAfterAbortRefresh(
      previousLiveMessages,
      fetchedHistoryMessages,
    )

    expect(result).toEqual([{ id: 'a-local', role: 'assistant', text: 'partial answer' }])
  })

  it('drops assistant draft when history already has same content', () => {
    const previousLiveMessages: ChatUiMessage[] = [
      { id: 'a-local', role: 'assistant', text: 'partial answer' },
    ]
    const fetchedHistoryMessages: ChatUiMessage[] = [
      { id: 'a-server', role: 'assistant', text: 'partial answer' },
    ]

    const result = buildLiveMessagesAfterAbortRefresh(
      previousLiveMessages,
      fetchedHistoryMessages,
    )

    expect(result).toEqual([])
  })

  it('treats suffix overlap as already persisted assistant content', () => {
    const previousLiveMessages: ChatUiMessage[] = [
      { id: 'a-local', role: 'assistant', text: 'partial answer' },
    ]
    const fetchedHistoryMessages: ChatUiMessage[] = [
      { id: 'a-server', role: 'assistant', text: 'final: partial answer' },
    ]

    const result = buildLiveMessagesAfterAbortRefresh(
      previousLiveMessages,
      fetchedHistoryMessages,
    )

    expect(result).toEqual([])
  })

  it('returns empty list when no non-empty assistant draft exists', () => {
    const previousLiveMessages: ChatUiMessage[] = [
      { id: 'u-local', role: 'user', text: 'question' },
      { id: 'a-local', role: 'assistant', text: '   ' },
    ]

    const result = buildLiveMessagesAfterAbortRefresh(previousLiveMessages, [])

    expect(result).toEqual([])
  })
})
