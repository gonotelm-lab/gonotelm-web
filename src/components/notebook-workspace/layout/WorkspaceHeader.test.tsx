import type { ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'

vi.mock('@mui/material', () => ({
  Box: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) => (
    <div {...props}>{children}</div>
  ),
  Button: ({
    children,
    startIcon,
    ...props
  }: { children?: ReactNode; startIcon?: ReactNode } & Record<string, unknown>) => (
    <button type="button" {...props}>
      {startIcon}
      {children}
    </button>
  ),
  IconButton: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  InputBase: ({
    value,
    inputProps,
    ...props
  }: { value?: string; inputProps?: Record<string, unknown> } & Record<string, unknown>) => (
    <input data-testid="workspace-title-input" value={value} {...inputProps} {...props} />
  ),
  Menu: ({ children, open }: { children?: ReactNode; open?: boolean }) =>
    open ? <div data-testid="workspace-more-menu">{children}</div> : null,
  MenuItem: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  CircularProgress: () => <span data-testid="workspace-status-spinner" />,
}))

vi.mock('@mui/icons-material/AddOutlined', () => ({ default: () => null }))
vi.mock('@mui/icons-material/ArrowBackOutlined', () => ({ default: () => null }))
vi.mock('@mui/icons-material/IosShareOutlined', () => ({ default: () => null }))
vi.mock('@mui/icons-material/MoreVertRounded', () => ({ default: () => null }))
vi.mock('@mui/icons-material/RefreshRounded', () => ({ default: () => null }))
vi.mock('@mui/icons-material/TuneRounded', () => ({ default: () => null }))

// 账号菜单有自己的测试；这里只验证“更多选项”菜单的接线。
vi.mock('../../auth/AccountMenu', () => ({ AccountMenu: () => <div data-testid="account-menu" /> }))

import { WorkspaceHeader, type WorkspaceHeaderChatMenu } from './WorkspaceHeader'

const renderHeader = (chatMenu?: WorkspaceHeaderChatMenu, extra: { isFetching?: boolean } = {}) => {
  let renderer!: ReactTestRenderer
  act(() => {
    renderer = create(
      <WorkspaceHeader
        notebookName="第三季度复盘"
        isFetching={extra.isFetching ?? false}
        isUpdatingName={false}
        onNotebookNameCommit={() => undefined}
        chatMenu={chatMenu}
      />,
    )
  })
  return renderer
}

const buildChatMenu = (overrides: Partial<WorkspaceHeaderChatMenu> = {}): WorkspaceHeaderChatMenu => ({
  refreshDisabled: false,
  isRefreshing: false,
  onConfigureChat: vi.fn(),
  onRefreshChat: vi.fn(),
  ...overrides,
})

const openMoreMenu = (renderer: ReactTestRenderer) => {
  const trigger = renderer.root.findByProps({ 'data-testid': 'workspace-more-options' })
  act(() => trigger.props.onClick({ currentTarget: {} }))
}

describe('WorkspaceHeader', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh')
  })

  it('“更多选项”以竖向三点图标为触发器，点开后是配置对话与刷新对话', () => {
    const renderer = renderHeader(buildChatMenu())

    expect(renderer.root.findAllByProps({ 'data-testid': 'workspace-more-menu' })).toHaveLength(0)

    openMoreMenu(renderer)

    expect(renderer.root.findByProps({ 'data-testid': 'workspace-more-menu' })).toBeTruthy()
    expect(renderer.root.findByProps({ 'data-testid': 'workspace-configure-chat' })).toBeTruthy()
    expect(renderer.root.findByProps({ 'data-testid': 'workspace-refresh-chat' })).toBeTruthy()
    expect(
      renderer.root.findByProps({ 'aria-label': '更多选项' }),
    ).toBeTruthy()
  })

  it('点“配置对话”触发面板设置并收起菜单', () => {
    const chatMenu = buildChatMenu()
    const renderer = renderHeader(chatMenu)
    openMoreMenu(renderer)

    act(() => renderer.root.findByProps({ 'data-testid': 'workspace-configure-chat' }).props.onClick())

    expect(chatMenu.onConfigureChat).toHaveBeenCalledTimes(1)
    expect(chatMenu.onRefreshChat).not.toHaveBeenCalled()
    expect(renderer.root.findAllByProps({ 'data-testid': 'workspace-more-menu' })).toHaveLength(0)
  })

  it('点“刷新对话”触发刷新并收起菜单', () => {
    const chatMenu = buildChatMenu()
    const renderer = renderHeader(chatMenu)
    openMoreMenu(renderer)

    act(() => renderer.root.findByProps({ 'data-testid': 'workspace-refresh-chat' }).props.onClick())

    expect(chatMenu.onRefreshChat).toHaveBeenCalledTimes(1)
    expect(chatMenu.onConfigureChat).not.toHaveBeenCalled()
    expect(renderer.root.findAllByProps({ 'data-testid': 'workspace-more-menu' })).toHaveLength(0)
  })

  it('无会话 / 刷新中 / 生成中时“刷新对话”禁用', () => {
    const disabled = renderHeader(buildChatMenu({ refreshDisabled: true }))
    openMoreMenu(disabled)
    expect(
      disabled.root.findByProps({ 'data-testid': 'workspace-refresh-chat' }).props.disabled,
    ).toBe(true)

    const enabled = renderHeader(buildChatMenu({ refreshDisabled: false }))
    openMoreMenu(enabled)
    expect(
      enabled.root.findByProps({ 'data-testid': 'workspace-refresh-chat' }).props.disabled,
    ).toBe(false)
  })

  it('刷新中复用 header 尾部 spinner 反馈', () => {
    expect(
      renderHeader(buildChatMenu({ isRefreshing: true })).root.findAllByProps({
        'data-testid': 'workspace-status-spinner',
      }),
    ).toHaveLength(1)
    expect(
      renderHeader(buildChatMenu({ isRefreshing: false })).root.findAllByProps({
        'data-testid': 'workspace-status-spinner',
      }),
    ).toHaveLength(0)
  })

  it('不传 chatMenu 时不渲染“更多选项”', () => {
    const renderer = renderHeader()
    expect(
      renderer.root.findAllByProps({ 'data-testid': 'workspace-more-options' }),
    ).toHaveLength(0)
  })

  it('尾部“创建笔记本 / 分享”是占位：出中文文案，但不接任何行为', () => {
    const renderer = renderHeader(buildChatMenu())

    const createButton = renderer.root.findByProps({
      'data-testid': 'workspace-create-notebook',
    })
    const shareButton = renderer.root.findByProps({
      'data-testid': 'workspace-share-notebook',
    })

    expect(createButton.props.children).toBe('创建笔记本')
    expect(shareButton.props.children).toBe('分享')
    // 占位阶段不接逻辑：没有 onClick，也就不会误触发请求 / 弹窗。
    expect(createButton.props.onClick).toBeUndefined()
    expect(shareButton.props.onClick).toBeUndefined()
  })

  it('占位入口与“更多选项”解耦，无会话时也照样显示', () => {
    const renderer = renderHeader()

    expect(
      renderer.root.findByProps({ 'data-testid': 'workspace-create-notebook' }),
    ).toBeTruthy()
    expect(
      renderer.root.findByProps({ 'data-testid': 'workspace-share-notebook' }),
    ).toBeTruthy()
  })

  it('标题放大到 20px，但控件盒与内边距不变（header 仍 48px）', () => {
    const sx = renderHeader().root.findByProps({ 'data-testid': 'workspace-title-input' }).props
      .sx as Record<string, unknown>

    expect(sx.fontSize).toBe('1.25rem')
    expect(sx.height).toBe(36)
    // 行高由 rowMinHeight 锁死，字号变大只吃控件盒内的余量，无需再减 padding。
    expect(sx.py).toBe(0)
    expect((sx['& input'] as Record<string, unknown>).py).toBe(0)
  })
})
