import type { ReactNode } from 'react'
import { Checkbox } from '@mui/material'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { SourceListRow } from './SourceListRow'
import type { SourceListItem } from '../types/sourceTypes'

vi.mock('@mui/material', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mui/material')>()
  return {
    ...actual,
    Menu: ({ open, children }: { open?: boolean; children?: ReactNode }) =>
      open ? <div data-testid="source-action-menu">{children}</div> : null,
    MenuItem: ({
      children,
      ...props
    }: { children?: ReactNode } & Record<string, unknown>) => {
      const { sx: _sx, ...rest } = props
      void _sx
      return (
        <button type="button" {...rest}>
          {children}
        </button>
      )
    },
  }
})

// text 类型来源渲染的就是这个图标；用它当重渲染探针。
const notesIconRenders = vi.hoisted(() => ({ count: 0 }))

vi.mock('@mui/icons-material/NotesOutlined', () => ({
  default: () => {
    notesIconRenders.count += 1
    return null
  },
}))

vi.mock('./FlowLoadingOverlay', () => ({
  FlowLoadingOverlay: () => null,
}))

vi.mock('../../../shared/ui/studioSemanticTones', () => ({
  resolveSourceTypeTone: () => ({
    accent: '#2f6b4f',
    border: 'rgba(47, 107, 79, 0.28)',
    icon: '#2f6b4f',
    surface: 'rgba(47, 107, 79, 0.1)',
  }),
}))

const sourceItem: SourceListItem = {
  id: 'source-1',
  kind: 'text',
  title: 'source title',
  name: '来源一',
  iconType: 'text',
  status: 'ready',
}

const createRenderer = (canManageContent = true) => {
  const onToggleItem = vi.fn()
  let renderer = null as unknown as ReactTestRenderer
  act(() => {
    renderer = create(
      <SourceListRow
        item={sourceItem}
        checked={false}
        removing={false}
        isBusy={false}
        canManageContent={canManageContent}
        onToggleItem={onToggleItem}
        onDeleteItem={async () => undefined}
        onRetryItem={async () => undefined}
        onRenameItem={async () => undefined}
        onPreviewItem={() => undefined}
      />,
    )
  })
  return {
    renderer,
    onToggleItem,
  }
}

describe('SourceListRow', () => {
  const openActionMenu = (renderer: ReactTestRenderer) => {
    // MUI 会把 data-testid 透传多层，按 props 计数不可靠；
    // 直接调用真实触发器（button）的 onClick 打开菜单。
    const button = renderer.root.findByType('button')
    act(() => {
      button.props.onClick({
        stopPropagation: () => undefined,
        currentTarget: button,
      })
    })
  }

  it('无编辑权限时无可用操作，整组入口不渲染', () => {
    const { renderer } = createRenderer(false)

    // text 来源没有「打开」，且重试/重命名/移除都需要编辑权限：
    // 菜单可操作项为空，三个点与菜单整体收起。
    expect(
      renderer.root.findAllByProps({ 'data-testid': 'source-action-trigger' }),
    ).toHaveLength(0)
    expect(
      renderer.root.findAllByProps({ 'data-testid': 'sources-action-edit' }),
    ).toHaveLength(0)
    expect(
      renderer.root.findAllByProps({ 'data-testid': 'sources-action-delete' }),
    ).toHaveLength(0)
    expect(
      renderer.root.findAllByProps({ 'data-testid': 'sources-action-retry' }),
    ).toHaveLength(0)
  })

  it('有编辑权限时操作菜单包含改标题与删除', () => {
    const { renderer } = createRenderer(true)
    openActionMenu(renderer)

    expect(
      renderer.root.findAllByProps({ 'data-testid': 'sources-action-edit' }),
    ).not.toHaveLength(0)
    expect(
      renderer.root.findAllByProps({ 'data-testid': 'sources-action-delete' }),
    ).not.toHaveLength(0)
  })

  it('点击复选框后应通知父级切换勾选', () => {
    const { renderer, onToggleItem } = createRenderer()

    const checkbox = renderer.root.findByType(Checkbox)
    expect(checkbox.props.checked).toBe(false)

    act(() => {
      checkbox.props.onChange({
        target: { checked: true },
      })
    })

    expect(onToggleItem).toHaveBeenCalledWith('source-1', true)
  })

  it('单击行打开预览，不切换勾选', () => {
    const onToggleItem = vi.fn()
    const onPreviewItem = vi.fn()
    let renderer = null as unknown as ReactTestRenderer
    act(() => {
      renderer = create(
        <SourceListRow
          item={sourceItem}
          checked={false}
          removing={false}
          isBusy={false}
          onToggleItem={onToggleItem}
          onDeleteItem={async () => undefined}
          onRetryItem={async () => undefined}
          onRenameItem={async () => undefined}
          onPreviewItem={onPreviewItem}
        />,
      )
    })

    const rowWithClick = renderer.root.find(
      (node) => typeof node.props.onClick === 'function' && node.type !== 'button',
    )
    act(() => {
      rowWithClick.props.onClick()
    })

    expect(onPreviewItem).toHaveBeenCalledWith(sourceItem)
    expect(onToggleItem).not.toHaveBeenCalled()
  })

  it('等价的新 item 对象不重渲染整行，字段真正变化才重渲染', () => {
    const rowProps = {
      checked: false,
      removing: false,
      isBusy: false,
      onToggleItem: vi.fn(),
      onDeleteItem: async () => undefined,
      onRetryItem: async () => undefined,
      onRenameItem: async () => undefined,
      onPreviewItem: () => undefined,
      previewLoading: false,
    }
    let renderer = null as unknown as ReactTestRenderer
    act(() => {
      renderer = create(<SourceListRow item={sourceItem} {...rowProps} />)
    })
    const afterMount = notesIconRenders.count
    expect(afterMount).toBeGreaterThan(0)

    // 父层每次 sources 变化都会重建 item 对象：内容一致时不应重渲染
    act(() => {
      renderer.update(<SourceListRow item={{ ...sourceItem }} {...rowProps} />)
    })
    expect(notesIconRenders.count).toBe(afterMount)

    // 内容字段变化必须放行
    act(() => {
      renderer.update(<SourceListRow item={{ ...sourceItem, title: '改过的标题' }} {...rowProps} />)
    })
    expect(notesIconRenders.count).toBeGreaterThan(afterMount)
  })
})
