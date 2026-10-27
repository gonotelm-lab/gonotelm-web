import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToggleButtonGroup, Typography } from '@mui/material'
import { delay, http } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockServer, setMockScenario } from '@/test/mocks'
import {
  createListNotebooksResponseFixture,
  createNotebookSummaryFixture,
} from '@/test/mocks/fixtures/notebook'
import { createSuccessResponse } from '@/test/mocks/handlers/httpResponse'
import { NotebookCard } from '../components/home/NotebookCard'
import { HomePage } from './HomePage'

// 账号菜单与列表筛选无关，替换成占位节点，避免它的头像/菜单依赖影响首页渲染。
vi.mock('../components/auth/AccountMenu', () => ({
  AccountMenu: () => <div data-testid="account-menu" />,
}))

// 测试跑在 node 环境：MUI Menu/Popover 卸载时会无条件访问 window，
// 这里只补事件接口，避免卡片卸载触发 ReferenceError。
beforeEach(() => {
  vi.stubGlobal('window', {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

const renderHome = async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  let renderer!: ReactTestRenderer
  await act(async () => {
    renderer = create(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="*" element={<HomePage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
  })
  await flush()
  return renderer
}

const switchScope = async (
  renderer: ReactTestRenderer,
  scope: 'owned' | 'shared',
) => {
  const group = renderer.root.findByType(ToggleButtonGroup)
  await act(async () => {
    group.props.onChange({}, scope)
  })
  await flush()
}

describe('HomePage · 笔记本范围筛选', () => {
  it('默认展示我的笔记本，owner 空位由 emoji 占位', async () => {
    const renderer = await renderHome()
    const cards = renderer.root.findAllByType(NotebookCard)

    expect(cards.map((card) => card.props.title)).toEqual([
      'Rust 生命周期',
      'Rust 入门',
      'Rust 并发',
    ])
    expect(cards.every((card) => card.props.owner === undefined)).toBe(true)
    expect(new Set(cards.map((card) => card.props.emoji)).size).toBeGreaterThan(1)
    expect(cards.every((card) => typeof card.props.onDelete === 'function')).toBe(true)
    expect(cards.every((card) => typeof card.props.onPin === 'function')).toBe(true)
    expect(cards.every((card) => card.props.onUnpin === undefined)).toBe(true)
  })

  it('切换到共享给我后展示 owner，并隐藏删除入口', async () => {
    const renderer = await renderHome()

    await switchScope(renderer, 'shared')

    const cards = renderer.root.findAllByType(NotebookCard)
    expect(cards.map((card) => card.props.title)).toEqual([
      'Async Patterns',
      '团队 Rust 指南',
    ])
    expect(cards.map((card) => card.props.owner)).toEqual([
      { nickname: 'Bob', avatarUrl: '' },
      { nickname: 'Alice', avatarUrl: '' },
    ])
    expect(cards.every((card) => card.props.onDelete === undefined)).toBe(true)
    expect(cards.every((card) => typeof card.props.onPin === 'function')).toBe(true)
  })

  it('有置顶时在 scope 筛选上方展示置顶区，且仅提供取消置顶', async () => {
    mockServer.use(
      http.get('http://127.0.0.1:4173/api/v1/notebooks/pins', () =>
        createSuccessResponse({
          notebooks: [
            createNotebookSummaryFixture({
              id: 'notebook-pinned-1',
              name: '置顶本',
              is_pinned: true,
              pinned_at: Date.UTC(2025, 6, 21),
            }),
          ],
        }),
      ),
    )

    const renderer = await renderHome()
    const cards = renderer.root.findAllByType(NotebookCard)

    expect(cards.map((card) => card.props.title)).toEqual([
      '置顶本',
      'Rust 生命周期',
      'Rust 入门',
      'Rust 并发',
    ])
    expect(typeof cards[0]?.props.onUnpin).toBe('function')
    expect(cards[0]?.props.onPin).toBeUndefined()
  })

  it('切换范围时保留上一次列表，避免列表区域塌陷', async () => {
    const renderer = await renderHome()
    expect(renderer.root.findAllByType(NotebookCard)).toHaveLength(3)

    mockServer.use(
      http.get('http://127.0.0.1:4173/api/v1/notebooks', async () => {
        await delay(50)
        return createSuccessResponse(
          createListNotebooksResponseFixture([
            createNotebookSummaryFixture({
              id: 'notebook-shared-1',
              name: '团队 Rust 指南',
              owner: {
                user_id: 'user-alice',
                nickname: 'Alice',
                avatar_url: '',
              },
            }),
          ]),
        )
      }),
    )

    const group = renderer.root.findByType(ToggleButtonGroup)
    await act(async () => {
      group.props.onChange({}, 'shared')
    })

    // 新数据还没回来时，旧列表应继续占位，而不是先塌成 loading 行。
    expect(renderer.root.findAllByType(NotebookCard)).toHaveLength(3)

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80))
    })

    const cards = renderer.root.findAllByType(NotebookCard)
    expect(cards.map((card) => card.props.title)).toEqual(['团队 Rust 指南'])
  })

  it('共享列表为空时展示空态文案', async () => {
    setMockScenario('notebook', 'empty')
    const renderer = await renderHome()

    await switchScope(renderer, 'shared')

    expect(renderer.root.findAllByType(NotebookCard)).toHaveLength(0)
    const emptyState = renderer.root
      .findAllByType(Typography)
      .find((node) => node.props.children === '还没有人分享笔记本给您')
    expect(emptyState).toBeTruthy()
  })
})
