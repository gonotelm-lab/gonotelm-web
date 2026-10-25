import { describe, expect, it } from 'vitest'
import { getNotebookEmoji } from './notebookEmoji'

describe('getNotebookEmoji', () => {
  it('同一 id 稳定返回同一 emoji', () => {
    expect(getNotebookEmoji('notebook-1')).toBe(getNotebookEmoji('notebook-1'))
    expect(getNotebookEmoji('notebook-1')).toBe(
      getNotebookEmoji('notebook-1'),
    )
  })

  it('不同 id 可以映射到不同 emoji', () => {
    const ids = Array.from({ length: 60 }, (_, i) => `notebook-${i}`)
    const distinct = new Set(ids.map(getNotebookEmoji))
    expect(distinct.size).toBeGreaterThan(1)
  })

  it('结果落在 64 个 emoji 集合内（含空 id 兜底）', () => {
    const ids = ['', 'notebook-1', 'notebook-2', 'uuid-abcdef-1234']
    for (const id of ids) {
      expect(getNotebookEmoji(id)).toMatch(/^\p{Extended_Pictographic}$/u)
    }
  })
})
