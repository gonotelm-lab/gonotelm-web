import { describe, expect, it } from 'vitest'
import { applyStreamEvent, createEmptyAssistantMessage } from './streamEventReducer'
import type { StreamTaskEvent } from '@/types/api'

describe('applyStreamEvent', () => {
  it('INIT message creates assistant skeleton', () => {
    const msg = createEmptyAssistantMessage('asst-1')
    const event: StreamTaskEvent = {
      id: '1-0',
      op: 'INIT',
      p: 'm',
      message: {
        id: 'asst-1',
        create_time: 0,
        update_time: 0,
        chat_id: 'chat-1',
        user_id: 'u1',
        role: 'assistant',
        seq_no: 1,
        fragments: [],
      },
    }
    const result = applyStreamEvent(msg, event)
    expect(result.id).toBe('asst-1')
    expect(result.fragments).toEqual([])
  })

  it('APPEND response content text', () => {
    let msg = createEmptyAssistantMessage('asst-1')
    msg = applyStreamEvent(msg, {
      id: '2-0',
      op: 'NEW',
      p: 'm.f.rsp',
      idx: -1,
      rsp: { st: 'RUNNING', v: { type: 'text', text: { content: '' } } },
    })
    msg = applyStreamEvent(msg, {
      id: '3-0',
      op: 'APPEND',
      p: 'm.f.rsp.v',
      idx: -1,
      rsp: { v: { type: 'text', text: { content: 'Hello' } } },
    })
    const response = msg.fragments.find((fragment) => fragment.type === 'RESPONSE')
    expect(response?.response?.content).toBe('Hello')
  })

  it('SET citations', () => {
    let msg = createEmptyAssistantMessage('asst-1')
    msg = applyStreamEvent(msg, {
      id: '4-0',
      op: 'SET',
      p: 'm.citations',
      citations: [
        { doc_id: 'doc-a', source_id: 'source-a' },
        { doc_id: 'doc-b', source_id: 'source-b' },
      ],
    })
    expect(msg.citations).toEqual([
      { docId: 'doc-a', sourceId: 'source-a' },
      { docId: 'doc-b', sourceId: 'source-b' },
    ])
  })

  it('NEW phase fragment', () => {
    let msg = createEmptyAssistantMessage('asst-1')
    msg = applyStreamEvent(msg, {
      id: '5-0',
      op: 'NEW',
      p: 'm.f.phase',
      idx: -1,
      phase: { phase: { status: 'FINISHED', summary: '检索证据', thought: '...' } },
    })
    expect(msg.fragments).toHaveLength(1)
    expect(msg.fragments[0]?.phase?.summary).toBe('检索证据')
  })
})
