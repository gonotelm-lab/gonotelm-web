import { describe, expect, it } from 'vitest'
import '@/i18n'
import { toNotebookCardViewModel } from './notebookCardViewModel'

describe('toNotebookCardViewModel', () => {
  it('空名回退到未命名文案，公开可见性映射为 isPublic', () => {
    const viewModel = toNotebookCardViewModel({
      id: 'nb-0',
      name: '   ',
      desc: '',
      flags: { customize_description: false },
      source_count: 1,
      updated_at: Date.UTC(2025, 6, 18),
      visibility: 'public',
    })

    expect(viewModel.title).toBe('未命名笔记本')
    expect(viewModel.isPublic).toBe(true)
  })

  it('空描述回退到占位文案', () => {
    const viewModel = toNotebookCardViewModel({
      id: 'nb-1',
      name: 'Rust 入门',
      desc: '   ',
      flags: { customize_description: false },
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
      flags: { customize_description: true },
      source_count: 5,
      updated_at: Date.UTC(2025, 6, 19),
    })

    expect(viewModel.id).toBe('nb-2')
    expect(viewModel.title).toBe('Rust 并发')
    expect(viewModel.sourceCount).toBe(5)
    expect(viewModel.dateLabel).toContain('2025')
    expect(viewModel.owner).toBeUndefined()
  })

  it('卡片日期优先展示创建时间，缺省回退更新时间', () => {
    const createdAtMs = Date.UTC(2025, 0, 5)
    const updatedAtMs = Date.UTC(2025, 5, 30)

    // 双字段齐全：显示 created_at。
    expect(
      toNotebookCardViewModel({
        id: 'nb-created',
        name: 'Rust 入门',
        desc: '',
        flags: { customize_description: false },
        source_count: 1,
        updated_at: updatedAtMs,
        created_at: createdAtMs,
      }).dateLabel,
    ).toContain('2025年1月5日')

    // 旧后端无 created_at：回退 updated_at，不出「未知日期」。
    expect(
      toNotebookCardViewModel({
        id: 'nb-fallback',
        name: 'Rust 入门',
        desc: '',
        flags: { customize_description: false },
        source_count: 1,
        updated_at: updatedAtMs,
      }).dateLabel,
    ).toContain('2025年6月30日')
  })

  it('映射共享笔记本的 owner', () => {
    const viewModel = toNotebookCardViewModel({
      id: 'nb-shared',
      name: '团队指南',
      desc: '共享笔记',
      flags: { customize_description: true },
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

  it('封面 URL 映射到 coverUrl；空串/缺失视为无封面', () => {
    expect(
      toNotebookCardViewModel({
        id: 'nb-cover',
        name: '带封面',
        desc: '',
        flags: { customize_description: false },
        source_count: 1,
        updated_at: Date.UTC(2025, 6, 18),
        cover_url: 'https://cdn.example.com/covers/nb-cover.webp',
      }).coverUrl,
    ).toBe('https://cdn.example.com/covers/nb-cover.webp')

    // 旧后端缺 cover_url 字段
    expect(
      toNotebookCardViewModel({
        id: 'nb-nofield',
        name: '无字段',
        desc: '',
        flags: { customize_description: false },
        source_count: 1,
        updated_at: Date.UTC(2025, 6, 18),
      }).coverUrl,
    ).toBeUndefined()

    // 空串也要顶掉，避免首页用空 src 发请求
    expect(
      toNotebookCardViewModel({
        id: 'nb-empty',
        name: '空封面',
        desc: '',
        flags: { customize_description: false },
        source_count: 1,
        updated_at: Date.UTC(2025, 6, 18),
        cover_url: '   ',
      }).coverUrl,
    ).toBeUndefined()
  })
})
