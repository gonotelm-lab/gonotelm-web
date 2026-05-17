import { describe, expect, it } from 'vitest'
import { toNotebookCardViewModel } from './notebookCardViewModel'

describe('toNotebookCardViewModel', () => {
  it('空描述回退到占位文案', () => {
    const viewModel = toNotebookCardViewModel({
      id: 'nb-1',
      name: 'Rust 入门',
      desc: '   ',
      source_count: 2,
      updated_at: Date.UTC(2025, 6, 18),
    })

    expect(viewModel.description).toBe('无描述')
  })

  it('正确映射核心字段', () => {
    const viewModel = toNotebookCardViewModel({
      id: 'nb-2',
      name: 'Rust 并发',
      desc: '并发原语',
      source_count: 5,
      updated_at: Date.UTC(2025, 6, 19),
    })

    expect(viewModel.id).toBe('nb-2')
    expect(viewModel.title).toBe('Rust 并发')
    expect(viewModel.sourceCount).toBe(5)
    expect(viewModel.dateLabel).toContain('2025')
  })
})
