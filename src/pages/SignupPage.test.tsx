import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { http } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockServer } from '@/test/mocks'
import {
  createErrorResponse,
  createSuccessResponse,
} from '@/test/mocks/handlers/httpResponse'
import { SignupPage } from './SignupPage'
import { resetAuthRedirectForTest } from '@/lib/auth'

const meUrl = 'http://127.0.0.1:4173/api/v1/user/me'
const registerUrl = 'http://127.0.0.1:4173/api/v1/auth/email/register'
const prefetchUrl = 'http://127.0.0.1:4173/api/v1/auth/prefetch'

const renderSignup = async () => {
  mockServer.use(http.get(meUrl, () => createErrorResponse(401, 'NOT_LOGIN', 2002)))
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  let renderer!: ReactTestRenderer
  await act(async () => {
    renderer = create(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/signup?return_to=%2Fnotebook%2Fn-1']}>
          <Routes>
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/verify-email" element={<div data-testid="verify-landed" />} />
            <Route path="/notebook/n-1" element={<div data-testid="home-landed" />} />
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

const submitDisabled = (renderer: ReactTestRenderer) =>
  renderer.root.findByProps({ 'data-testid': 'signup-submit' }).props.disabled

describe('SignupPage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('渲染邮箱/密码/确认三个输入；未填完时按钮仍可点，点击只报错不发请求', async () => {
    let sent: unknown = null
    mockServer.use(
      http.post(registerUrl, async ({ request }) => {
        sent = await request.json()
        return createSuccessResponse({ email_verified: false })
      }),
    )

    const renderer = await renderSignup()

    expect(renderer.root.findByProps({ 'data-testid': 'signup-email-input' })).toBeTruthy()
    expect(renderer.root.findByProps({ 'data-testid': 'signup-password-input' })).toBeTruthy()
    expect(renderer.root.findByProps({ 'data-testid': 'signup-confirm-input' })).toBeTruthy()
    // 空表单也能点：按钮不再被校验结果禁用
    expect(submitDisabled(renderer)).toBe(false)

    // 点了才亮错误：邮箱格式 + 密码太短，且一个字节都没发出去
    await submitForm(renderer)
    expect(sent).toBeNull()
    expect(JSON.stringify(renderer.toJSON())).toContain('邮箱格式不正确')
    expect(JSON.stringify(renderer.toJSON())).toContain('密码至少 8 位')

    fillInput(renderer, 'signup-email-input', 'a@b.com')
    fillInput(renderer, 'signup-password-input', 'short')
    fillInput(renderer, 'signup-confirm-input', 'short')
    await submitForm(renderer)
    expect(sent).toBeNull()
    expect(JSON.stringify(renderer.toJSON())).toContain('密码至少 8 位')

    fillInput(renderer, 'signup-password-input', 'long-enough')
    fillInput(renderer, 'signup-confirm-input', 'long-enough')
    await submitForm(renderer)
    expect(sent).toEqual({ email: 'a@b.com', password: 'long-enough' })
  })

  it('两次密码不一致时给出提示，点击不发请求', async () => {
    let sent: unknown = null
    mockServer.use(
      http.post(registerUrl, async ({ request }) => {
        sent = await request.json()
        return createSuccessResponse({ email_verified: false })
      }),
    )

    const renderer = await renderSignup()

    fillInput(renderer, 'signup-email-input', 'a@b.com')
    fillInput(renderer, 'signup-password-input', 'long-enough')
    fillInput(renderer, 'signup-confirm-input', 'long-enough-2')

    expect(JSON.stringify(renderer.toJSON())).toContain('两次输入的密码不一致')
    expect(submitDisabled(renderer)).toBe(false)

    await submitForm(renderer)
    expect(sent).toBeNull()
    expect(renderer.root.findAllByProps({ 'data-testid': 'verify-landed' })).toHaveLength(0)
  })

  it('密码框的眼睛在密文/明文之间切换，且不会顺手提交表单', async () => {
    let sent: unknown = null
    mockServer.use(
      http.post(registerUrl, async ({ request }) => {
        sent = await request.json()
        return createSuccessResponse({ email_verified: false })
      }),
    )

    const renderer = await renderSignup()
    const typeOf = (testId: string) =>
      renderer.root.findByProps({ 'data-testid': testId }).props.type ?? 'text'

    expect(typeOf('signup-password-input')).toBe('password')
    expect(typeOf('signup-confirm-input')).toBe('password')

    // 无障碍名来自 common 命名空间：键没接上时这里会退化成 action.showPassword
    const eye = renderer.root.findByProps({ 'data-testid': 'signup-password-visibility' })
    expect(eye.props['aria-label']).toBe('显示密码')

    // 眼睛是 type=button，点它只切换可见性，不能把表单提交出去
    act(() => {
      renderer.root.findByProps({ 'data-testid': 'signup-password-visibility' }).props.onClick()
    })
    expect(typeOf('signup-password-input')).toBe('text')
    expect(typeOf('signup-confirm-input')).toBe('password')
    expect(sent).toBeNull()

    act(() => {
      renderer.root.findByProps({ 'data-testid': 'signup-confirm-visibility' }).props.onClick()
    })
    expect(typeOf('signup-confirm-input')).toBe('text')

    act(() => {
      renderer.root.findByProps({ 'data-testid': 'signup-password-visibility' }).props.onClick()
    })
    expect(typeOf('signup-password-input')).toBe('password')
  })

  it('注册成功（需要验证）：POST 归一化邮箱与密码，并跳到验证页', async () => {
    let received: unknown = null
    mockServer.use(
      http.post(registerUrl, async ({ request }) => {
        received = await request.json()
        return createSuccessResponse({ email_verified: false })
      }),
    )

    const renderer = await renderSignup()
    fillInput(renderer, 'signup-email-input', '  Foo@Bar.com ')
    fillInput(renderer, 'signup-password-input', 'secret-123')
    fillInput(renderer, 'signup-confirm-input', 'secret-123')
    await submitForm(renderer)

    expect(received).toEqual({ email: 'foo@bar.com', password: 'secret-123' })
    expect(renderer.root.findByProps({ 'data-testid': 'verify-landed' })).toBeTruthy()
  })

  it('注册成功（免验证模式）：后端已建号并签发会话，直接进 return_to', async () => {
    mockServer.use(
      http.post(registerUrl, () =>
        createSuccessResponse({ email_verified: true, user_id: 'user-1' }),
      ),
    )

    const renderer = await renderSignup()
    fillInput(renderer, 'signup-email-input', 'foo@bar.com')
    fillInput(renderer, 'signup-password-input', 'secret-123')
    fillInput(renderer, 'signup-confirm-input', 'secret-123')
    await submitForm(renderer)

    expect(renderer.root.findByProps({ 'data-testid': 'home-landed' })).toBeTruthy()
    expect(renderer.root.findAllByProps({ 'data-testid': 'verify-landed' })).toHaveLength(0)
  })

  it('服务端要求复杂密码时：清单随输入实时逐条反馈，简单密码点击只报错不发请求', async () => {
    let sent: unknown = null
    mockServer.use(
      http.get(prefetchUrl, () => createSuccessResponse({ require_complex_password: true })),
      http.post(registerUrl, async ({ request }) => {
        sent = await request.json()
        return createSuccessResponse({ email_verified: false })
      }),
    )

    const renderer = await renderSignup()
    const hintMet = (key: string) => {
      const row = renderer.root.findAll(
        (node) =>
          typeof node.type === 'string' &&
          node.props['data-testid'] === `signup-password-hints-${key}`,
      )[0]
      return String(row?.props['data-met'])
    }

    fillInput(renderer, 'signup-email-input', 'a@b.com')
    fillInput(renderer, 'signup-password-input', 'password123')
    fillInput(renderer, 'signup-confirm-input', 'password123')

    // 还没点提交，清单就已经逐条标出：长度/小写/数字满足，缺的只有大写
    expect(hintMet('length')).toBe('true')
    expect(hintMet('lower')).toBe('true')
    expect(hintMet('digit')).toBe('true')
    expect(hintMet('upper')).toBe('false')
    expect(JSON.stringify(renderer.toJSON())).toContain('包含大写字母')

    // 不符合复杂密码要求时按钮照样可点
    expect(submitDisabled(renderer)).toBe(false)

    await submitForm(renderer)
    expect(sent).toBeNull()
    expect(renderer.root.findAllByProps({ 'data-testid': 'verify-landed' })).toHaveLength(0)

    fillInput(renderer, 'signup-password-input', 'Password123')
    fillInput(renderer, 'signup-confirm-input', 'Password123')
    expect(hintMet('upper')).toBe('true')

    await submitForm(renderer)
    expect(sent).toEqual({ email: 'a@b.com', password: 'Password123' })
    expect(renderer.root.findByProps({ 'data-testid': 'verify-landed' })).toBeTruthy()
  })

  it('服务端不要求复杂密码时只提示长度，不渲染复杂度清单', async () => {
    const renderer = await renderSignup()

    expect(renderer.root.findAllByProps({ 'data-testid': 'signup-password-hints' })).toHaveLength(0)

    fillInput(renderer, 'signup-email-input', 'a@b.com')
    fillInput(renderer, 'signup-password-input', 'short')

    expect(renderer.root.findAllByProps({ 'data-testid': 'signup-password-hints' })).toHaveLength(0)
    expect(JSON.stringify(renderer.toJSON())).toContain('密码至少 8 位')
  })

  it('106012 映射为「该邮箱已注册」', async () => {
    mockServer.use(
      http.post(registerUrl, () => createErrorResponse(200, 'EMAIL_TAKEN', 106012)),
    )

    const renderer = await renderSignup()
    fillInput(renderer, 'signup-email-input', 'a@b.com')
    fillInput(renderer, 'signup-password-input', 'secret-123')
    fillInput(renderer, 'signup-confirm-input', 'secret-123')
    await submitForm(renderer)

    renderer.root.findByProps({ 'data-testid': 'signup-error' })
    expect(JSON.stringify(renderer.toJSON())).toContain('该邮箱已注册')
  })

  it('未登录访问注册页不会被弹回登录页', async () => {
    // 回归：注册页要探一次 /user/me 判断「已登录就短路」，这次 2002 不能被当成会话失效，
    // 否则点「创建账号」会立刻跳回 /login。
    resetAuthRedirectForTest()
    const assign = vi.fn()
    vi.stubGlobal('window', {
      location: { pathname: '/signup', search: '', assign, origin: 'http://localhost' },
    })

    const renderer = await renderSignup()

    expect(assign).not.toHaveBeenCalled()
    expect(renderer.root.findByProps({ 'data-testid': 'signup-email-input' })).toBeTruthy()
  })
})
