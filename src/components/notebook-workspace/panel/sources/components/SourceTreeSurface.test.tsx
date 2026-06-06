import type { ComponentProps, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GetSourceParsedTreeResponse } from '@/types/api'
import { SourceTreeSurface } from '@/components/notebook-workspace/panel/sources/components/SourceTreeSurface'
import { buildSourceTreeStats } from '../preview/sourceTreeStats'

const richTreeSpy = vi.hoisted(() => vi.fn())

vi.mock('@mui/material', () => ({
  Box: ({
    children,
    'data-testid': dataTestId,
  }: {
    children?: ReactNode
    'data-testid'?: string
  }) => <div data-testid={dataTestId}>{children}</div>,
  Typography: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
}))

vi.mock('../preview/sourceTreeStats', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../preview/sourceTreeStats')>()
  return {
    ...actual,
    buildSourceTreeStats: vi.fn(actual.buildSourceTreeStats),
  }
})

vi.mock('@mui/x-tree-view/RichTreeView', () => ({
  RichTreeView: (props: {
    items: Array<{ id: string; label: string; children?: Array<{ id: string; label: string }> }>
    defaultExpandedItems?: string[]
    sx?: Record<string, unknown>
  }) => {
    richTreeSpy(props)
    return (
      <div data-testid="rich-tree" data-expanded-ids={props.defaultExpandedItems?.join(',') ?? ''}>
        {props.items.map((item) => (
          <span key={item.id}>{item.label}</span>
        ))}
      </div>
    )
  },
}))

const renderSourceTreeSurface = (props: ComponentProps<typeof SourceTreeSurface>) =>
  renderToStaticMarkup(<SourceTreeSurface {...props} />)

const tree: GetSourceParsedTreeResponse = {
  height: 1,
  root: {
    id: 'root',
    content: 'Root Node',
    level: 0,
    pos: 0,
    is_leaf: false,
    children: [],
  },
}

const nestedTree: GetSourceParsedTreeResponse = {
  height: 2,
  root: {
    id: 'root',
    content: 'Root Node',
    level: 0,
    pos: 0,
    is_leaf: false,
    children: [
      {
        id: 'child-1',
        content: 'Child Node',
        level: 1,
        pos: 1,
        is_leaf: true,
        children: [],
      },
    ],
  },
}

describe('SourceTreeSurface', () => {
  beforeEach(() => {
    vi.mocked(buildSourceTreeStats).mockClear()
    richTreeSpy.mockClear()
  })

  it('无 root 时展示空态文案', () => {
    const html = renderSourceTreeSurface({ tree: { height: 0 }, showStats: true })
    expect(html).toContain('data-testid="source-tree-empty"')
    expect(html).toContain('当前来源暂无可展示的树结构。')
  })

  it('tree=null 时展示空态文案', () => {
    const html = renderSourceTreeSurface({ tree: null, showStats: true })
    expect(html).toContain('data-testid="source-tree-empty"')
    expect(html).toContain('当前来源暂无可展示的树结构。')
  })

  it('有 root 时渲染 RichTreeView 节点', () => {
    const html = renderSourceTreeSurface({ tree, showStats: true })
    expect(html).toContain('Root Node')
  })

  it('showStats=true 时渲染统计信息', () => {
    const html = renderSourceTreeSurface({ tree, showStats: true })
    expect(html).toContain('L0: 1')
    expect(buildSourceTreeStats).toHaveBeenCalledTimes(1)
  })

  it('showStats=false 时不渲染统计条但树仍渲染', () => {
    const html = renderSourceTreeSurface({ tree, showStats: false })
    expect(html).toContain('Root Node')
    expect(html).not.toContain('L0: 1')
    expect(html).toContain('data-testid="rich-tree"')
    expect(buildSourceTreeStats).not.toHaveBeenCalled()
  })

  it('defaultExpandedItems 包含所有树节点 id', () => {
    renderSourceTreeSurface({ tree: nestedTree, showStats: false })
    const props = richTreeSpy.mock.calls.at(-1)?.[0] as { defaultExpandedItems?: string[] } | undefined
    expect(props?.defaultExpandedItems).toEqual(['root', 'child-1'])
  })

  it('RichTreeView 的 sx 包含 focused 样式', () => {
    renderSourceTreeSurface({ tree, showStats: false })
    const props = richTreeSpy.mock.calls.at(-1)?.[0] as { sx?: Record<string, unknown> } | undefined
    const focusedStyles = props?.sx?.['& .MuiTreeItem-content[data-focused]'] as
      | Record<string, unknown>
      | undefined
    expect(focusedStyles).toEqual({
      outline: '2px solid',
      outlineColor: 'primary.light',
      outlineOffset: 1,
    })
  })
})
