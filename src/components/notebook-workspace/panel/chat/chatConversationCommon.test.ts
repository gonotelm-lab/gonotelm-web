import { describe, expect, it } from 'vitest'
import { isStreamTerminalEvent } from './chatConversationCommon'
import type { StreamTaskEvent } from '@/types/api'

describe('isStreamTerminalEvent', () => {
  it('returns true when done is true', () => {
    const event: StreamTaskEvent = { id: '1-0', done: true }
    expect(isStreamTerminalEvent(event)).toBe(true)
  })

  it('returns true when error message is present', () => {
    const event: StreamTaskEvent = {
      id: '2-0',
      error: { message: '系统错误，请稍后重试' },
    }
    expect(isStreamTerminalEvent(event)).toBe(true)
  })

  it('returns false for regular stream events', () => {
    const event: StreamTaskEvent = {
      id: '3-0',
      op: 'APPEND',
      p: 'm.f.rsp.v',
      rsp: { v: { type: 'text', text: { content: 'hi' } } },
    }
    expect(isStreamTerminalEvent(event)).toBe(false)
  })
})
