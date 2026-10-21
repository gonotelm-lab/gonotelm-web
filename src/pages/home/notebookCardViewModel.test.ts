import { describe, expect, it } from 'vitest'
import '@/i18n'
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
    expect(viewModel.owner).toBeUndefined()
  })

  it('映射共享笔记本的 owner', () => {
    const viewModel = toNotebookCardViewModel({
      id: 'nb-shared',
      name: '团队指南',
      desc: '共享笔记',
      source_count: 3,
      updated_at: Date.UTC(2025, 6, 20),
      owner: {
        user_id: 'user-1',
        nickname: 'Alice',
        avatar_url: 'https://cdn.example.com/avatars/alice.png',
      },
    })

    expect(viewModel.owner).toEqual({
      nickname: 'Alice',
      avatarUrl: 'https://cdn.example.com/avatars/alice.png',
    })
  })
})
