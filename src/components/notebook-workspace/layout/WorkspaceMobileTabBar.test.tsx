import type { ReactNode } from 'react'
import { act, create } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@mui/material', () => ({
  Paper: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  BottomNavigation: ({
    value,
    onChange,
    children,
  }: {
    value: string
    onChange: (_event: unknown, nextValue: string) => void
    children?: ReactNode
    showLabels?: boolean
  }) => (
    <div
      data-testid="bottom-navigation"
      data-value={value}
      // Test helper: invoke onChange with sources.
      onClick={() => onChange({}, 'sources')}
    >
      {children}
    </div>
  ),
  BottomNavigationAction: ({
    value,
    'aria-label': ariaLabel,
  }: {
    value: string
    label?: string
    icon?: ReactNode
    'aria-label'?: string
  }) => <button type="button" data-value={value} aria-label={ariaLabel} />,
}))

vi.mock('@mui/icons-material/DescriptionOutlined', () => ({
  default: () => null,
}))
vi.mock('@mui/icons-material/AutoAwesomeOutlined', () => ({
  default: () => null,
}))
vi.mock('@mui/icons-material/ChatBubbleOutlineRounded', () => ({
  default: () => null,
}))

import { WorkspaceMobileTabBar } from './WorkspaceMobileTabBar'

describe('WorkspaceMobileTabBar', () => {
  it('notifies when BottomNavigation changes value', () => {
    const onChange = vi.fn()
    let renderer: ReturnType<typeof create>
    act(() => {
      renderer = create(<WorkspaceMobileTabBar value="chat" onChange={onChange} />)
    })

    const navigation = renderer!.root.findByProps({ 'data-testid': 'bottom-navigation' })
    expect(navigation.props['data-value']).toBe('chat')

    act(() => {
      navigation.props.onClick()
    })
    expect(onChange).toHaveBeenCalledWith('sources')
  })

  it('exposes aria-labels for all tabs', () => {
    let renderer: ReturnType<typeof create>
    act(() => {
      renderer = create(<WorkspaceMobileTabBar value="chat" onChange={() => undefined} />)
    })

    const labels = renderer!.root
      .findAll((node) => typeof node.props['aria-label'] === 'string')
      .map((node) => node.props['aria-label'] as string)

    expect(labels).toEqual(expect.arrayContaining(['来源', '对话', 'Studio']))
  })
})
