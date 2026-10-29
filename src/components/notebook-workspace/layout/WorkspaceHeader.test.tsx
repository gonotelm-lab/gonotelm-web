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
  Tooltip: ({ children }: { children?: ReactNode }) => <>{children}</>,
  Typography: ({
    children,
    ...props
  }: { children?: ReactNode } & Record<string, unknown>) => {
    const { sx: _sx, noWrap: _noWrap, component: _component, ...rest } = props
    void _sx
    void _noWrap
    void _component
    return <h1 {...rest}>{children}</h1>
  },
}))

vi.mock('@mui/icons-material/AddOutlined', () => ({ default: () => null }))
vi.mock('@mui/icons-material/DescriptionOutlined', () => ({ default: () => null }))
vi.mock('@mui/icons-material/IosShareOutlined', () => ({ default: () => null }))
vi.mock('@mui/icons-material/MoreVertRounded', () => ({ default: () => null }))
vi.mock('@mui/icons-material/PublicOutlined', () => ({
  default: () => <span data-testid="icon-public" />,
}))
vi.mock('@mui/icons-material/RefreshRounded', () => ({ default: () => null }))
vi.mock('@mui/icons-material/TuneRounded', () => ({ default: () => null }))

// 账号菜单有自己的测试；这里只验证“更多选项”菜单的接线。
vi.mock('../../auth/AccountMenu', () => ({ AccountMenu: () => <div data-testid="account-menu" /> }))

import { WorkspaceHeader, type WorkspaceHeaderChatMenu } from './WorkspaceHeader'

const renderHeader = (
  chatMenu?: WorkspaceHeaderChatMenu,
  extra: {
    isFetching?: boolean
    canRenameNotebook?: boolean
    isPublic?: boolean
    onNotebookNameCommit?: (value: string) => void
    onShareNotebook?: () => void
    onCustomizeNotebook?: () => void
  } = {},
) => {
  let renderer!: ReactTestRenderer
  act(() => {
    renderer = create(
      <WorkspaceHeader
        notebookName="第三季度复盘"
        isFetching={extra.isFetching ?? false}
        isUpdatingName={false}
        isPublic={extra.isPublic}
        canRenameNotebook={extra.canRenameNotebook ?? true}
        onNotebookNameCommit={extra.onNotebookNameCommit ?? (() => undefined)}
        onShareNotebook={extra.onShareNotebook}
        onCustomizeNotebook={extra.onCustomizeNotebook}
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

  it('“更多选项”以竖向三点图标为触发器，点开后是自定义笔记本、配置对话与刷新对话', () => {
    const renderer = renderHeader(buildChatMenu(), {
      onCustomizeNotebook: vi.fn(),
    })

    expect(renderer.root.findAllByProps({ 'data-testid': 'workspace-more-menu' })).toHaveLength(0)

    openMoreMenu(renderer)

    expect(renderer.root.findByProps({ 'data-testid': 'workspace-more-menu' })).toBeTruthy()
    expect(renderer.root.findByProps({ 'data-testid': 'workspace-customize-notebook' })).toBeTruthy()
    expect(renderer.root.findByProps({ 'data-testid': 'workspace-configure-chat' })).toBeTruthy()
    expect(renderer.root.findByProps({ 'data-testid': 'workspace-refresh-chat' })).toBeTruthy()
    expect(
      renderer.root.findByProps({ 'aria-label': '更多选项' }),
    ).toBeTruthy()
  })

  it('点“自定义笔记本”触发回调并收起菜单', () => {
    const onCustomizeNotebook = vi.fn()
    const renderer = renderHeader(buildChatMenu(), { onCustomizeNotebook })
    openMoreMenu(renderer)

    act(() =>
      renderer.root.findByProps({ 'data-testid': 'workspace-customize-notebook' }).props.onClick(),
    )

    expect(onCustomizeNotebook).toHaveBeenCalledTimes(1)
    expect(renderer.root.findAllByProps({ 'data-testid': 'workspace-more-menu' })).toHaveLength(0)
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

  it('不传 chatMenu 与自定义笔记本回调时不渲染“更多选项”', () => {
    const renderer = renderHeader()
    expect(
      renderer.root.findAllByProps({ 'data-testid': 'workspace-more-options' }),
    ).toHaveLength(0)
  })

  it('仅传自定义笔记本回调时仍渲染“更多选项”', () => {
    const renderer = renderHeader(undefined, { onCustomizeNotebook: vi.fn() })
    expect(
      renderer.root.findByProps({ 'data-testid': 'workspace-more-options' }),
    ).toBeTruthy()
    openMoreMenu(renderer)
    expect(renderer.root.findByProps({ 'data-testid': 'workspace-customize-notebook' })).toBeTruthy()
    expect(renderer.root.findAllByProps({ 'data-testid': 'workspace-configure-chat' })).toHaveLength(0)
  })

  it('尾部“创建笔记本”仍是占位，“分享”接页面回调', () => {
    const onShareNotebook = vi.fn()
    const renderer = renderHeader(buildChatMenu(), { onShareNotebook })

    const createButton = renderer.root.findByProps({
      'data-testid': 'workspace-create-notebook',
    })
    const shareButton = renderer.root.findByProps({
      'data-testid': 'workspace-share-notebook',
    })

    expect(createButton.props.children).toBe('创建笔记本')
    expect(shareButton.props.children).toBe('分享')
    // 创建入口仍是占位：没有 onClick，也就不会误触发请求 / 弹窗。
    expect(createButton.props.onClick).toBeUndefined()

    act(() => shareButton.props.onClick())
    expect(onShareNotebook).toHaveBeenCalledTimes(1)
  })

  it('非 owner 未传分享回调时不渲染分享按钮', () => {
    const renderer = renderHeader()
    expect(
      renderer.root.findAllByProps({ 'data-testid': 'workspace-share-notebook' }),
    ).toHaveLength(0)
  })

  it('分享入口由 owner 回调控制，不依赖“更多选项”', () => {
    const renderer = renderHeader(undefined, { onShareNotebook: vi.fn() })

    expect(
      renderer.root.findByProps({ 'data-testid': 'workspace-create-notebook' }),
    ).toBeTruthy()
    expect(
      renderer.root.findByProps({ 'data-testid': 'workspace-share-notebook' }),
    ).toBeTruthy()
    expect(
      renderer.root.findAllByProps({ 'data-testid': 'workspace-more-options' }),
    ).toHaveLength(0)
  })

  it('最左的品牌标记就是回首页入口：链接到 /，无障碍名字来自按钮而非图形', () => {
    const renderer = renderHeader()

    // 箭头已并入标记：整条顶栏只有一个回首页控件，不再并排两个同目标入口。
    const homeLinks = renderer.root
      .findAllByType('button')
      .filter((node) => node.props.to === '/')

    expect(homeLinks).toHaveLength(1)

    const [homeLink] = homeLinks
    expect(homeLink.props['aria-label']).toBe('返回')

    const mark = homeLink.findByProps({ src: '/favicon.svg' })
    // 图形保持装饰：读屏念的只有按钮的 aria-label，不会重复念一遍图片。
    expect(mark.props.alt).toBe('')
    expect(mark.props['aria-hidden']).toBe(true)
  })

  it('没有改名权限时整体隐藏标题编辑入口，只展示纯文本标题', () => {
    const onNotebookNameCommit = vi.fn()
    const renderer = renderHeader(undefined, {
      canRenameNotebook: false,
      onNotebookNameCommit,
    })

    // 不再渲染输入框：没有权限的人看不到任何可编辑的入口。
    expect(
      renderer.root.findAllByProps({ 'data-testid': 'workspace-title-input' }),
    ).toHaveLength(0)

    const title = renderer.root.findByProps({ 'data-testid': 'workspace-title' })
    expect(title.props.children).toBe('第三季度复盘')
    expect(onNotebookNameCommit).not.toHaveBeenCalled()
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
