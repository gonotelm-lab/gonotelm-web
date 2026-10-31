import { describe, expect, it } from 'vitest'
import {
  CHAT_TIME_SEPARATOR_GAP_MS,
  computeChatTimeSeparatorFlags,
  formatChatTimeLabel,
  normalizeChatCreateTimeMs,
} from './chatTimeSeparator'

describe('normalizeChatCreateTimeMs', () => {
  it('passes through millisecond timestamps', () => {
    expect(normalizeChatCreateTimeMs(1_700_000_000_000)).toBe(1_700_000_000_000)
  })

  it('converts second-scale timestamps to ms', () => {
    expect(normalizeChatCreateTimeMs(1_700_000_000)).toBe(1_700_000_000_000)
  })

  it('returns 0 for invalid values', () => {
    expect(normalizeChatCreateTimeMs(0)).toBe(0)
    expect(normalizeChatCreateTimeMs(-1)).toBe(0)
  })
})

describe('computeChatTimeSeparatorFlags', () => {
  const t0 = Date.UTC(2026, 9, 31, 6, 0, 0)

  it('shows only on user messages, never on assistant', () => {
    const flags = computeChatTimeSeparatorFlags([
      { role: 'user', createTime: t0 },
      { role: 'assistant', createTime: t0 + 60_000 },
      { role: 'user', createTime: t0 + CHAT_TIME_SEPARATOR_GAP_MS },
      { role: 'assistant', createTime: t0 + CHAT_TIME_SEPARATOR_GAP_MS + 1_000 },
    ])
    expect(flags).toEqual([true, false, true, false])
  })

  it('does not insert between a user turn and its assistant reply', () => {
    const flags = computeChatTimeSeparatorFlags([
      { role: 'user', createTime: t0 },
      { role: 'assistant', createTime: t0 + CHAT_TIME_SEPARATOR_GAP_MS + 10_000 },
    ])
    expect(flags).toEqual([true, false])
  })

  it('anchors gap on previous user, ignoring assistant in between', () => {
    const underGap = computeChatTimeSeparatorFlags([
      { role: 'user', createTime: t0 },
      { role: 'assistant', createTime: t0 + 1_000 },
      { role: 'user', createTime: t0 + CHAT_TIME_SEPARATOR_GAP_MS - 1 },
    ])
    expect(underGap).toEqual([true, false, false])

    const atGap = computeChatTimeSeparatorFlags([
      { role: 'user', createTime: t0 },
      { role: 'assistant', createTime: t0 + 1_000 },
      { role: 'user', createTime: t0 + CHAT_TIME_SEPARATOR_GAP_MS },
    ])
    expect(atGap).toEqual([true, false, true])
  })

  it('skips users without valid createTime when anchoring', () => {
    const flags = computeChatTimeSeparatorFlags([
      { role: 'user', createTime: 0 },
      { role: 'assistant', createTime: t0 },
      { role: 'user', createTime: t0 },
      { role: 'user', createTime: t0 + 1_000 },
    ])
    expect(flags).toEqual([false, false, true, false])
  })
})

describe('formatChatTimeLabel', () => {
  // Fixed "now": 2026-10-31 15:00 local — construct via Date parts so TZ-stable.
  const now = new Date(2026, 9, 31, 15, 0, 0).getTime()

  it('formats same-day as HH:mm', () => {
    const ts = new Date(2026, 9, 31, 9, 5, 0).getTime()
    expect(formatChatTimeLabel(ts, now)).toBe('09:05')
  })

  it('formats yesterday', () => {
    const ts = new Date(2026, 9, 30, 14, 30, 0).getTime()
    expect(formatChatTimeLabel(ts, now)).toBe('昨天 14:30')
  })

  it('formats within a week as weekday + time', () => {
    // 2026-10-28 is Wednesday
    const ts = new Date(2026, 9, 28, 11, 0, 0).getTime()
    expect(formatChatTimeLabel(ts, now)).toBe('星期三 11:00')
  })

  it('formats older same-year as M月D日 HH:mm', () => {
    const ts = new Date(2026, 9, 14, 14, 30, 0).getTime()
    expect(formatChatTimeLabel(ts, now)).toBe('10月14日 14:30')
  })

  it('formats cross-year with year prefix', () => {
    const ts = new Date(2024, 9, 14, 14, 30, 0).getTime()
    expect(formatChatTimeLabel(ts, now)).toBe('2024年10月14日 14:30')
  })
})
