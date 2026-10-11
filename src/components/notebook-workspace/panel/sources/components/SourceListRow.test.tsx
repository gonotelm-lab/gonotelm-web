import { Checkbox } from '@mui/material'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { SourceListRow } from './SourceListRow'
import type { SourceListItem } from '../types/sourceTypes'

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

const createRenderer = () => {
  const onToggleItem = vi.fn()
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
        onPreviewItem={() => undefined}
        previewLoading={false}
      />,
    )
  })
  return {
    renderer,
    onToggleItem,
  }
}

describe('SourceListRow', () => {
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
