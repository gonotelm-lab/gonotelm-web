import { describe, expect, it } from 'vitest'
import {
  isStreamTerminalEvent,
  shouldFireStreamCompleted,
  shouldFlushStreamEventImmediately,
  shouldFlushStreamEventOnNextFrame,
} from './chatConversationCommon'
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

describe('stream flush scheduling', () => {
  it('flushes structural events immediately', () => {
    expect(
      shouldFlushStreamEventImmediately({
        id: '1-0',
        op: 'NEW',
        p: 'm.f.rsp',
      }),
    ).toBe(true)
  })

  it('defers think append events', () => {
    expect(
      shouldFlushStreamEventImmediately({
        id: '2-0',
        op: 'APPEND',
        p: 'm.f.tk.v',
        tk: { v: 'thinking' },
      }),
    ).toBe(false)
  })

  it('schedules response append events on next frame', () => {
    const event: StreamTaskEvent = {
      id: '3-0',
      op: 'APPEND',
      p: 'm.f.rsp.v',
      rsp: { v: { type: 'text', text: { content: 'hi' } } },
    }
    expect(shouldFlushStreamEventImmediately(event)).toBe(false)
    expect(shouldFlushStreamEventOnNextFrame(event)).toBe(true)
  })
})

describe('shouldFireStreamCompleted', () => {
  it('fires only when the stream finished without user abort', () => {
    expect(shouldFireStreamCompleted(true, false)).toBe(true)
    expect(shouldFireStreamCompleted(true, true)).toBe(false)
    expect(shouldFireStreamCompleted(false, false)).toBe(false)
    expect(shouldFireStreamCompleted(false, true)).toBe(false)
  })
})
