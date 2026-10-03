import type { ReactNode, MouseEvent } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockServer } from '@/test/mocks'
import { createErrorResponse, createSuccessResponse } from '@/test/mocks/handlers/httpResponse'

vi.mock('@mui/material', () => ({
  IconButton: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  Menu: ({ children, open }: { children?: ReactNode; open?: boolean; anchorEl?: unknown; onClose?: () => void }) =>
    open ? <div data-testid="account-menu">{children}</div> : null,
  MenuItem: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  Avatar: ({
    children,
    src,
    alt,
    ...props
  }: { children?: ReactNode; src?: string; alt?: string } & Record<string, unknown>) => (
    <span data-avatar-src={src} data-avatar-alt={alt} {...props}>
      {children}
    </span>
  ),
  Typography: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) => (
    <span {...props}>{children}</span>
  ),
}))

vi.mock('@mui/icons-material/AccountCircleOutlined', () => ({ default: () => null }))

// 设置对话框有自己的测试；这里只验证账号菜单的开关接线。
vi.mock('../settings/SettingsDialog', () => ({
  SettingsDialog: ({ open }: { open?: boolean; onClose?: () => void }) =>
    open ? <div data-testid="settings-dialog" /> : null,
}))

import { AccountMenu } from './AccountMenu'

const renderMenu = async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  let renderer!: ReactTestRenderer
  await act(async () => {
    renderer = create(
      <QueryClientProvider client={queryClient}>
        <AccountMenu />
      </QueryClientProvider>,
    )
  })
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  return renderer
}

const openMenu = (renderer: ReactTestRenderer) => {
  const trigger = renderer.root.findByProps({ 'data-testid': 'account-trigger' })
  act(() => trigger.props.onClick({ currentTarget: {} } as MouseEvent<HTMLElement>))
}

describe('AccountMenu', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('打开菜单展示设置与退出项，不再展示昵称', async () => {
    const renderer = await renderMenu()
    openMenu(renderer)
    expect(renderer.root.findByProps({ 'data-testid': 'account-settings' })).toBeTruthy()
    expect(renderer.root.findByProps({ 'data-testid': 'account-logout' })).toBeTruthy()
    expect(renderer.root.findAllByProps({ 'data-testid': 'account-nickname' })).toHaveLength(0)
  })

  it('avatar_url 有值时触发器渲染头像', async () => {
    const renderer = await renderMenu()
    expect(
      renderer.root.findByProps({ 'data-testid': 'account-trigger-avatar' }).props.src,
    ).toBe('https://cdn.example.com/avatars/user-1.png')
  })

  it('avatar_url 为空时回退为默认图标', async () => {
    mockServer.use(
      http.get('http://127.0.0.1:4173/api/v1/user/me', () =>
        createSuccessResponse({ user_id: 'user-1', nickname: '测试用户', avatar_url: '' }),
      ),
    )
    const renderer = await renderMenu()
    expect(
      renderer.root.findAllByProps({ 'data-testid': 'account-trigger-avatar' }),
    ).toHaveLength(0)
  })

  it('点击设置项打开设置对话框', async () => {
    const renderer = await renderMenu()
    expect(renderer.root.findAllByProps({ 'data-testid': 'settings-dialog' })).toHaveLength(0)

    openMenu(renderer)
    act(() => renderer.root.findByProps({ 'data-testid': 'account-settings' }).props.onClick())

    expect(renderer.root.findByProps({ 'data-testid': 'settings-dialog' })).toBeTruthy()
  })

  it('点击退出登录调用接口并回登录页', async () => {
    const assign = vi.fn()
    vi.stubGlobal('window', { location: { assign, pathname: '/', search: '', origin: 'http://localhost' } })
    const renderer = await renderMenu()
    openMenu(renderer)
    await act(async () => {
      await renderer.root.findByProps({ 'data-testid': 'account-logout' }).props.onClick()
    })
    expect(assign).toHaveBeenCalledWith('/login')
  })

  it('退出失败时展示错误且不跳转', async () => {
    mockServer.use(
      http.post('http://127.0.0.1:4173/api/v1/auth/logout', () =>
        createErrorResponse(500, 'boom', 500_001),
      ),
    )
    const assign = vi.fn()
    vi.stubGlobal('window', {
      location: { assign, pathname: '/', search: '', origin: 'http://localhost' },
    })
    const renderer = await renderMenu()
    openMenu(renderer)
    await act(async () => {
      await renderer.root.findByProps({ 'data-testid': 'account-logout' }).props.onClick()
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(assign).not.toHaveBeenCalled()
    expect(renderer.root.findByProps({ 'data-testid': 'account-logout-error' })).toBeTruthy()
  })
})
