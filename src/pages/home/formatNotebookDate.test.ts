import { describe, expect, it } from 'vitest'
import { formatNotebookDate } from './formatNotebookDate'

describe('formatNotebookDate', () => {
  it('无效时间戳返回占位文案', () => {
    expect(formatNotebookDate(0)).toBe('Unknown date')
  })

  it('有效时间戳返回英文短月日期', () => {
    const date = Date.UTC(2025, 6, 18, 8, 0, 0)
    const label = formatNotebookDate(date)

    expect(label).toMatch(/Jul/)
    expect(label).toMatch(/2025/)
  })
})
