import { describe, expect, it } from 'vitest'
import { mapChatMessageToUi } from './messageMapper'
import type { ChatMessage } from '@/types/api'

describe('mapChatMessageToUi', () => {
  it('maps user REQUEST fragment', () => {
    const msg: ChatMessage = {
      id: 'u1',
      create_time: 0,
      update_time: 0,
      chat_id: 'c1',
      user_id: 'u',
      role: 'user',
      seq_no: 1,
      fragments: [
        {
          id: 1,
          type: 'REQUEST',
          request: { content: { type: 'text', text: { content: '你好' } } },
        },
      ],
    }
    const ui = mapChatMessageToUi(msg)
    expect(ui.role).toBe('user')
    expect(ui.createTime).toBeUndefined()
    expect(ui.fragments[0]?.request?.content).toBe('你好')
  })

  it('maps create_time to createTime in ms', () => {
    const msg: ChatMessage = {
      id: 'u2',
      create_time: 1_700_000_000_000,
      update_time: 0,
      chat_id: 'c1',
      user_id: 'u',
      role: 'user',
      seq_no: 1,
      fragments: [],
    }
    expect(mapChatMessageToUi(msg).createTime).toBe(1_700_000_000_000)
  })

  it('normalizes second-scale create_time to ms', () => {
    const msg: ChatMessage = {
      id: 'u3',
      create_time: 1_700_000_000,
      update_time: 0,
      chat_id: 'c1',
      user_id: 'u',
      role: 'user',
      seq_no: 1,
      fragments: [],
    }
    expect(mapChatMessageToUi(msg).createTime).toBe(1_700_000_000_000)
  })

  it('maps assistant RESPONSE + citations', () => {
    const msg: ChatMessage = {
      id: 'a1',
      create_time: 0,
      update_time: 0,
      chat_id: 'c1',
      user_id: 'u',
      role: 'assistant',
      seq_no: 2,
      citations: [{ doc_id: 'doc-1', source_id: 'source-1' }],
      fragments: [
        {
          id: 1,
          type: 'RESPONSE',
          response: {
            status: 'FINISHED',
            content: { type: 'text', text: { content: '答案<sup>1</sup>' } },
          },
        },
      ],
    }
    const ui = mapChatMessageToUi(msg)
    expect(ui.citations).toEqual([{ docId: 'doc-1', sourceId: 'source-1' }])
    expect(ui.fragments[0]?.response?.content).toContain('答案')
  })
})
