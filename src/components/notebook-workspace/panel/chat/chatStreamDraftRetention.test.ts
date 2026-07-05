import { describe, expect, it } from 'vitest'
import type { ChatListMessagesResponse, ChatMessage } from '@/types/api'
import type { ChatUiMessage } from './types'
import {
  buildLiveMessagesAfterAbortRefresh,
  mapHistoryPagesToUiMessages,
} from './chatStreamDraftRetention'

const makeHistoryMessage = (
  id: string,
  role: 'user' | 'assistant',
  text: string,
): ChatMessage => ({
  id,
  create_time: 0,
  update_time: 0,
  chat_id: 'chat-1',
  user_id: 'user-1',
  role,
  seq_no: 1,
  fragments: [
    role === 'user'
      ? {
          id: 1,
          type: 'REQUEST',
          request: { content: { type: 'text', text: { content: text } } },
        }
      : {
          id: 1,
          type: 'RESPONSE',
          response: {
            status: 'FINISHED',
            content: { type: 'text', text: { content: text } },
          },
        },
  ],
})

const makePage = (messages: ChatMessage[]): ChatListMessagesResponse => ({
  messages,
  limit: 20,
  has_more: false,
  next_cursor: 0,
})

const makeUiMessage = (id: string, role: 'user' | 'assistant', text: string): ChatUiMessage => ({
  id,
  role,
  citations: [],
  fragments:
    role === 'user'
      ? [{ id: 1, type: 'REQUEST', request: { content: text } }]
      : [{ id: 1, type: 'RESPONSE', response: { status: 'FINISHED', content: text } }],
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
      makeUiMessage('u-local', 'user', 'question'),
      makeUiMessage('a-local', 'assistant', 'partial answer'),
    ]
    const fetchedHistoryMessages: ChatUiMessage[] = [makeUiMessage('u-server', 'user', 'question')]

    const result = buildLiveMessagesAfterAbortRefresh(previousLiveMessages, fetchedHistoryMessages)

    expect(result).toEqual([makeUiMessage('a-local', 'assistant', 'partial answer')])
  })

  it('drops assistant draft when history already has same content', () => {
    const previousLiveMessages: ChatUiMessage[] = [
      makeUiMessage('a-local', 'assistant', 'partial answer'),
    ]
    const fetchedHistoryMessages: ChatUiMessage[] = [
      makeUiMessage('a-server', 'assistant', 'partial answer'),
    ]

    const result = buildLiveMessagesAfterAbortRefresh(previousLiveMessages, fetchedHistoryMessages)

    expect(result).toEqual([])
  })

  it('treats suffix overlap as already persisted assistant content', () => {
    const previousLiveMessages: ChatUiMessage[] = [
      makeUiMessage('a-local', 'assistant', 'partial answer'),
    ]
    const fetchedHistoryMessages: ChatUiMessage[] = [
      makeUiMessage('a-server', 'assistant', 'final: partial answer'),
    ]

    const result = buildLiveMessagesAfterAbortRefresh(previousLiveMessages, fetchedHistoryMessages)

    expect(result).toEqual([])
  })

  it('returns empty list when no non-empty assistant draft exists', () => {
    const previousLiveMessages: ChatUiMessage[] = [
      makeUiMessage('u-local', 'user', 'question'),
      makeUiMessage('a-local', 'assistant', '   '),
    ]

    const result = buildLiveMessagesAfterAbortRefresh(previousLiveMessages, [])

    expect(result).toEqual([])
  })
})
