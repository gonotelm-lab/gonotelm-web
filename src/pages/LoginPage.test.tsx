import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { http } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockServer } from '@/test/mocks'
import {
  createErrorResponse,
  createNoContentResponse,
  createSuccessResponse,
} from '@/test/mocks/handlers/httpResponse'
import { LoginPage } from './LoginPage'

const providersUrl = 'http://127.0.0.1:4173/api/v1/auth/providers'
const passwordLoginUrl = 'http://127.0.0.1:4173/api/v1/auth/login'
const meUrl = 'http://127.0.0.1:4173/api/v1/user/me'

/** 后端 users_v2 改造落地后 providers 会带 password_enabled。 */
const enablePasswordLogin = () =>
  mockServer.use(
    http.get(providersUrl, () =>
      createSuccessResponse({
        providers: [{ name: 'github' }, { name: 'google' }],
        password_enabled: true,
      }),
    ),
  )

const renderLogin = async () => {
  // 覆盖默认 /user/me 成功 handler：未登录才能渲染 providers 表单
  mockServer.use(
    http.get(meUrl, () => createErrorResponse(401, 'NOT_LOGIN', 2002)),
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
      'http://127.0.0.1:4173/api/v1/auth/login?login_provider=github&login_from=web&return_to=http%3A%2F%2Flocalhost%2Fnotebook%2Fn-1',
    )
  })

  it('后端同时启用 github 与 google 时逐个渲染，点击 google 用对应 provider 跳转', async () => {
    const assign = vi.fn()
    vi.stubGlobal('window', { location: { assign, pathname: '/login', search: '', origin: 'http://localhost' } })

    const renderer = await renderLogin()

    // 两个 provider 各一个按钮，且文案走 i18n（provider.google → 「使用 Google 登录」）
    expect(renderer.root.findByProps({ 'data-provider': 'github' })).toBeTruthy()
    expect(renderer.root.findByProps({ 'data-provider': 'google' })).toBeTruthy()
    expect(JSON.stringify(renderer.toJSON())).toContain('使用 Google 登录')

    // 品牌标志是四色 Google「G」，四条 path 对应红/蓝/黄/绿
    const glyphPaths = renderer.root
      .findByProps({ 'data-provider': 'google' })
      .findAllByType('path')
    expect(glyphPaths.map((node) => node.props.fill)).toEqual([
      '#EA4335',
      '#4285F4',
      '#FBBC05',
      '#34A853',
    ])

    act(() => renderer.root.findByProps({ 'data-provider': 'google' }).props.onClick())

    expect(assign).toHaveBeenCalledWith(
      'http://127.0.0.1:4173/api/v1/auth/login?login_provider=google&login_from=web&return_to=http%3A%2F%2Flocalhost%2Fnotebook%2Fn-1',
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

  it('已登录时重定向到 return_to', async () => {
    // 使用默认 /user/me 成功 handler：已登录应重定向
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    let renderer!: ReactTestRenderer
    await act(async () => {
      renderer = create(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/login?return_to=%2Fnotebook%2Fn-1']}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/notebook/:id" element={<div data-testid="landed" />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      )
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(renderer.root.findByProps({ 'data-testid': 'landed' })).toBeTruthy()
  })
})

describe('LoginPage 邮箱口令登录（users_v2）', () => {
  afterEach(() => vi.unstubAllGlobals())

  /** 未登录 + 目标路由：既能渲染表单，又能断言登录成功后的落点。 */
  const renderLoginWithRoutes = async () => {
    mockServer.use(http.get(meUrl, () => createErrorResponse(401, 'NOT_LOGIN', 2002)))
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    let renderer!: ReactTestRenderer
    await act(async () => {
      renderer = create(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/login?return_to=%2Fnotebook%2Fn-1']}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/notebook/:id" element={<div data-testid="landed" />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      )
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    return renderer
  }

  const fillInput = (renderer: ReactTestRenderer, testId: string, value: string) => {
    act(() => {
      renderer.root.findByProps({ 'data-testid': testId }).props.onChange({ target: { value } })
    })
  }

  const submitForm = async (renderer: ReactTestRenderer) => {
    await act(async () => {
      renderer.root.findByType('form').props.onSubmit({ preventDefault: () => {} })
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  it('password_enabled 为 true 时渲染邮箱口令表单与注册入口', async () => {
    enablePasswordLogin()
    const renderer = await renderLogin()

    expect(renderer.root.findByProps({ 'data-testid': 'login-email-input' })).toBeTruthy()
    expect(renderer.root.findByProps({ 'data-testid': 'login-password-input' })).toBeTruthy()
    expect(renderer.root.findByProps({ 'data-testid': 'login-signup-link' })).toBeTruthy()
  })

  it('password_enabled 缺失（旧后端）时不渲染口令表单', async () => {
    const renderer = await renderLogin()

    expect(() => renderer.root.findByProps({ 'data-testid': 'login-email-input' })).toThrow()
    expect(() => renderer.root.findByProps({ 'data-testid': 'login-signup-link' })).toThrow()
  })

  it('注册入口指向 /signup 并保留 return_to', async () => {
    enablePasswordLogin()
    const renderer = await renderLogin()

    const link = renderer.root
      .findAllByProps({ 'data-testid': 'login-signup-link' })
      .find((node) => typeof node.props.to === 'string')
    expect(link?.props.to).toContain('/signup?return_to=')
    expect(link?.props.to).toContain(encodeURIComponent('/notebook/n-1'))
  })

  it('提交口令登录：POST /auth/login 带归一化邮箱与 login_from', async () => {
    enablePasswordLogin()
    let received: unknown = null
    mockServer.use(
      http.post(passwordLoginUrl, async ({ request }) => {
        received = await request.json()
        return createNoContentResponse()
      }),
    )

    const renderer = await renderLogin()
    fillInput(renderer, 'login-email-input', '  Foo@Bar.com ')
    fillInput(renderer, 'login-password-input', 'secret-123')
    await submitForm(renderer)

    expect(received).toEqual({
      email: 'foo@bar.com',
      password: 'secret-123',
      login_from: 'web',
    })
  })

  it('登录成功后跳回 return_to', async () => {
    enablePasswordLogin()
    mockServer.use(http.post(passwordLoginUrl, () => createNoContentResponse()))

    const renderer = await renderLoginWithRoutes()
    fillInput(renderer, 'login-email-input', 'foo@bar.com')
    fillInput(renderer, 'login-password-input', 'secret-123')
    await submitForm(renderer)

    expect(renderer.root.findByProps({ 'data-testid': 'landed' })).toBeTruthy()
  })

  it('106011 映射为「邮箱或口令不正确」而不是原始 msg', async () => {
    enablePasswordLogin()
    mockServer.use(
      http.post(passwordLoginUrl, () => createErrorResponse(200, 'INVALID_CREDENTIALS', 106011)),
    )

    const renderer = await renderLogin()
    fillInput(renderer, 'login-email-input', 'foo@bar.com')
    fillInput(renderer, 'login-password-input', 'wrong-password')
    await submitForm(renderer)

    renderer.root.findByProps({ 'data-testid': 'login-password-error' })
    expect(JSON.stringify(renderer.toJSON())).toContain('邮箱或口令不正确')
  })
})
