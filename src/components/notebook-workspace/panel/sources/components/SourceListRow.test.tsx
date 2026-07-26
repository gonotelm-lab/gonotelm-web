import { Checkbox } from '@mui/material'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { SourceListRow } from './SourceListRow'
import type { SourceListItem } from '../types/sourceTypes'

vi.mock('./FlowLoadingOverlay', () => ({
  FlowLoadingOverlay: () => null,
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
  it('点击复选框后应立即反馈勾选状态', () => {
    const { renderer, onToggleItem } = createRenderer()

    const checkbox = renderer.root.findByType(Checkbox)
    expect(checkbox.props.checked).toBe(false)

    act(() => {
      checkbox.props.onChange({
        target: { checked: true },
      })
    })

    const nextCheckbox = renderer.root.findByType(Checkbox)
    expect(nextCheckbox.props.checked).toBe(true)
    expect(onToggleItem).toHaveBeenCalledWith('source-1', true)
  })
})
