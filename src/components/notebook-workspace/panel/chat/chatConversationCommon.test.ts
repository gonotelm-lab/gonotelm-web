import { describe, expect, it } from 'vitest'
import {
  applyStickToBottomScroll,
  canShowCitationJumpButton,
  formatCitationPositionText,
  isLocatableCitationPosition,
  isNearBottom,
  isStreamTerminalEvent,
  resolveMessageItemContentVisibility,
  shouldFireStreamCompleted,
  shouldFlushStreamEventImmediately,
  shouldFlushStreamEventOnNextFrame,
  streamAutoScrollThresholdPx,
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

describe('isNearBottom', () => {
  it('treats the viewport as near bottom within the stream threshold', () => {
    expect(
      isNearBottom({
        scrollHeight: 1000,
        scrollTop: 960,
        clientHeight: 40,
      }),
    ).toBe(true)
  })

  it('does not treat a user who scrolled away as near bottom', () => {
    expect(
      isNearBottom({
        scrollHeight: 1000,
        scrollTop: 100,
        clientHeight: 400,
      }),
    ).toBe(false)
  })

  it('uses the shared stream threshold as the default cutoff', () => {
    expect(
      isNearBottom({
        scrollHeight: 500,
        scrollTop: 500 - 200 - (streamAutoScrollThresholdPx - 1),
        clientHeight: 200,
      }),
    ).toBe(true)
    expect(
      isNearBottom({
        scrollHeight: 500,
        scrollTop: 500 - 200 - streamAutoScrollThresholdPx,
        clientHeight: 200,
      }),
    ).toBe(false)
  })
})

describe('applyStickToBottomScroll', () => {
  it('jumps to the latest scrollHeight when the user is sticking to bottom', () => {
    const container = { scrollHeight: 1280, scrollTop: 400 }
    expect(applyStickToBottomScroll(container, true)).toBe(true)
    expect(container.scrollTop).toBe(1280)
  })

  it('leaves scrollTop unchanged when the user has scrolled away', () => {
    const container = { scrollHeight: 1280, scrollTop: 400 }
    expect(applyStickToBottomScroll(container, false)).toBe(false)
    expect(container.scrollTop).toBe(400)
  })

  it('no-ops when the scroll container is missing', () => {
    expect(applyStickToBottomScroll(null, true)).toBe(false)
  })
})

describe('resolveMessageItemContentVisibility', () => {
  it('keeps the last message fully measured so completed answers can pin to the real bottom', () => {
    expect(resolveMessageItemContentVisibility(true)).toBeUndefined()
    expect(resolveMessageItemContentVisibility(false)).toBe('auto')
  })
})

describe('citation position locatability', () => {
  it('treats missing or 0-0 positions as non-locatable', () => {
    expect(isLocatableCitationPosition(null)).toBe(false)
    expect(isLocatableCitationPosition({ start: 0, end: 0 })).toBe(false)
  })

  it('treats a real span as locatable', () => {
    expect(isLocatableCitationPosition({ start: 12, end: 48 })).toBe(true)
    expect(isLocatableCitationPosition({ start: 0, end: 10 })).toBe(true)
  })

  it('formats only locatable positions', () => {
    expect(formatCitationPositionText(null)).toBe('-')
    expect(formatCitationPositionText({ start: 0, end: 0 })).toBe('-')
    expect(formatCitationPositionText({ start: 12, end: 48 })).toBe('12 - 48')
  })

  it('shows jump only for locatable citations with a source', () => {
    expect(
      canShowCitationJumpButton({
        onOpenCitationJump: () => undefined,
        sourceId: 'src-1',
        position: { start: 1, end: 8 },
      }),
    ).toBe(true)
    expect(
      canShowCitationJumpButton({
        onOpenCitationJump: () => undefined,
        sourceId: 'src-1',
        position: { start: 0, end: 0 },
      }),
    ).toBe(false)
  })
})
