import type { ReactNode, MouseEvent } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
  Typography: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) => (
    <span {...props}>{children}</span>
  ),
}))

vi.mock('@mui/icons-material/AccountCircleOutlined', () => ({ default: () => null }))

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

  it('打开菜单展示昵称与退出项', async () => {
    const renderer = await renderMenu()
    openMenu(renderer)
    expect(
      renderer.root.findByProps({ 'data-testid': 'account-nickname' }).children.join(''),
    ).toBe('测试用户')
    expect(renderer.root.findByProps({ 'data-testid': 'account-logout' })).toBeTruthy()
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
})
