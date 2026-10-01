import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { http } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockServer } from '@/test/mocks'
import { createErrorResponse, createSuccessResponse } from '@/test/mocks/handlers/httpResponse'
import { LoginPage } from './LoginPage'

const renderLogin = async () => {
  // 覆盖默认 /user/me 成功 handler：未登录才能渲染 providers 表单
  mockServer.use(
    http.get('http://127.0.0.1:4173/api/v1/user/me', () =>
      createErrorResponse(401, 'NOT_LOGIN', 2002),
    ),
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  let renderer!: ReactTestRenderer
  await act(async () => {
    renderer = create(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/login?return_to=%2Fnotebook%2Fn-1']}>
          <LoginPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
  })
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  return renderer
}

describe('LoginPage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('展示 providers 并点击触发整页跳转', async () => {
    const assign = vi.fn()
    vi.stubGlobal('window', { location: { assign, pathname: '/login', search: '', origin: 'http://localhost' } })

    const renderer = await renderLogin()
    const button = renderer.root.findByProps({ 'data-provider': 'github' })
    act(() => button.props.onClick())

    expect(assign).toHaveBeenCalledWith(
      'http://127.0.0.1:4173/api/v1/auth/login?login_provider=github&login_from=web&return_to=%2Fnotebook%2Fn-1',
    )
  })

  it('providers 为空时展示空态', async () => {
    mockServer.use(
      http.get('http://127.0.0.1:4173/api/v1/auth/providers', () =>
        createSuccessResponse({ providers: [] }),
      ),
    )
    const renderer = await renderLogin()
    expect(renderer.root.findByProps({ 'data-testid': 'login-empty' })).toBeTruthy()
  })

  it('providers 出错时展示错误态与重试', async () => {
    mockServer.use(
      http.get('http://127.0.0.1:4173/api/v1/auth/providers', () =>
        createErrorResponse(500, 'boom', 500_001),
      ),
    )
    const renderer = await renderLogin()
    expect(renderer.root.findByProps({ 'data-testid': 'login-error' })).toBeTruthy()
  })
})
