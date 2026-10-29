import { describe, expect, it } from 'vitest'
import { isPinLimitReached, MAX_PINNED_NOTEBOOKS } from './notebookPins'

describe('notebookPins', () => {
  it('与后端额度对齐：满 50 视为达上限', () => {
    expect(MAX_PINNED_NOTEBOOKS).toBe(50)
    expect(isPinLimitReached(49)).toBe(false)
    expect(isPinLimitReached(50)).toBe(true)
    expect(isPinLimitReached(51)).toBe(true)
  })
})
