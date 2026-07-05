import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchSourceDocByCitation, rememberSourceDocMapping } from './citationResolver'

const getSourceDoc = vi.fn()

vi.mock('@/api/source', () => ({
  getSourceDoc: (...args: unknown[]) => getSourceDoc(...args),
}))

describe('citationResolver', () => {
  afterEach(() => {
    getSourceDoc.mockReset()
  })

  it('fetches doc with one getSourceDoc call', async () => {
    getSourceDoc.mockResolvedValue({
      source_id: 'source-1',
      doc_id: 'doc-1',
      source_title: 'Rust 笔记',
      content: '所有权',
      position: { start: 1, end: 3 },
    })

    const result = await fetchSourceDocByCitation('doc-1', 'source-1')

    expect(getSourceDoc).toHaveBeenCalledWith('source-1', 'doc-1')
    expect(getSourceDoc).toHaveBeenCalledTimes(1)
    expect(result?.content).toBe('所有权')
  })

  it('uses cached source mapping on subsequent lookups', async () => {
    rememberSourceDocMapping('doc-9', 'source-9')
    getSourceDoc.mockResolvedValue({
      source_id: 'source-9',
      doc_id: 'doc-9',
      source_title: '缓存来源',
      content: '缓存内容',
      position: { start: 4, end: 8 },
    })

    const result = await fetchSourceDocByCitation('doc-9', 'source-9')

    expect(getSourceDoc).toHaveBeenCalledWith('source-9', 'doc-9')
    expect(result?.content).toBe('缓存内容')
  })
})
