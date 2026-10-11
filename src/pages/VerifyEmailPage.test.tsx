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
import { VerifyEmailPage } from './VerifyEmailPage'

const meUrl = 'http://127.0.0.1:4173/api/v1/user/me'
const verifyUrl = 'http://127.0.0.1:4173/api/v1/auth/email/verify'
const verifyCodeUrl = 'http://127.0.0.1:4173/api/v1/auth/email/verify/code'
const resendUrl = 'http://127.0.0.1:4173/api/v1/auth/email/resend'

const renderVerify = async (entry = '/verify-email?return_to=%2F') => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  let renderer!: ReactTestRenderer
  await act(async () => {
    renderer = create(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[entry]}>
          <Routes>
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/set-password" element={<div data-testid="set-password-landed" />} />
            <Route path="/" element={<div data-testid="home-landed" />} />
            <Route path="/login" element={<div data-testid="login-landed" />} />
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

const meWith = (hasPassword: boolean) =>
  mockServer.use(
    http.get(meUrl, () =>
      createSuccessResponse({
        user_id: 'user-1',
        nickname: '测试用户',
        avatar_url: '',
        has_password: hasPassword,
      }),
    ),
  )

const submit = async (renderer: ReactTestRenderer, testId?: string) => {
  await act(async () => {
    if (testId) {
      renderer.root.findByProps({ 'data-testid': testId }).props.onClick()
    } else {
      renderer.root.findByType('form').props.onSubmit({ preventDefault: () => {} })
    }
  })
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

describe('VerifyEmailPage · 邮件链接模式', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('片段里有 token 时显示确认按钮，点击后 POST token 并回到 return_to', async () => {
    vi.stubGlobal('window', {
      location: { hash: '#token=tok-1', search: '', origin: 'http://localhost' },
    })
    let received: unknown = null
    mockServer.use(
      http.post(verifyUrl, async ({ request }) => {
        received = await request.json()
        return createSuccessResponse({ user_id: 'user-1' })
      }),
    )
    meWith(true)

    const renderer = await renderVerify()
    await submit(renderer, 'verify-link-submit')

    expect(received).toEqual({ token: 'tok-1', login_from: 'web' })
    expect(renderer.root.findByProps({ 'data-testid': 'home-landed' })).toBeTruthy()
  })

  it('验证后 has_password 为 false（跨设备验证）时转到设置口令页', async () => {
    vi.stubGlobal('window', {
      location: { hash: '#tok-1', search: '', origin: 'http://localhost' },
    })
    mockServer.use(http.post(verifyUrl, () => createSuccessResponse({ user_id: 'user-1' })))
    meWith(false)

    const renderer = await renderVerify()
    await submit(renderer, 'verify-link-submit')

    expect(renderer.root.findByProps({ 'data-testid': 'set-password-landed' })).toBeTruthy()
  })

  it('106016 映射为「链接或验证码已失效」', async () => {
    vi.stubGlobal('window', {
      location: { hash: '#token=tok-1', search: '', origin: 'http://localhost' },
    })
    mockServer.use(http.post(verifyUrl, () => createErrorResponse(200, 'VERIFY_EXPIRED', 106016)))

    const renderer = await renderVerify()
    await submit(renderer, 'verify-link-submit')

    renderer.root.findByProps({ 'data-testid': 'verify-error' })
    expect(JSON.stringify(renderer.toJSON())).toContain('已失效')
  })

  it('打开链接页不消费 token：必须用户点「确认验证」才 POST', async () => {
    vi.stubGlobal('window', {
      location: { hash: '#token=tok-1', search: '', origin: 'http://localhost' },
    })
    let calls = 0
    mockServer.use(
      http.post(verifyUrl, () => {
        calls += 1
        return createSuccessResponse({ user_id: 'user-1' })
      }),
    )

    const renderer = await renderVerify()

    // 邮件网关/预览器预取的是静态页，这里断言只挂载不发请求，否则 token 会被提前烧掉。
    expect(calls).toBe(0)
    expect(renderer.root.findByProps({ 'data-testid': 'verify-link-submit' })).toBeTruthy()
  })

  it('token 也可从 query 兜底读出', async () => {
    vi.stubGlobal('window', {
      location: { hash: '', search: '?token=tok-9', origin: 'http://localhost' },
    })
    let received: unknown = null
    mockServer.use(
      http.post(verifyUrl, async ({ request }) => {
        received = await request.json()
        return createSuccessResponse({ user_id: 'user-1' })
      }),
    )
    meWith(true)

    const renderer = await renderVerify()
    await submit(renderer, 'verify-link-submit')

    expect(received).toEqual({ token: 'tok-9', login_from: 'web' })
  })

  it('在链接模式与验证码模式之间切换', async () => {
    vi.stubGlobal('window', {
      location: { hash: '#token=tok-1', search: '', origin: 'http://localhost' },
    })

    const renderer = await renderVerify()
    expect(renderer.root.findByProps({ 'data-testid': 'verify-link-submit' })).toBeTruthy()

    act(() => renderer.root.findByProps({ 'data-testid': 'verify-use-code' }).props.onClick())
    expect(renderer.root.findByProps({ 'data-testid': 'verify-code-input' })).toBeTruthy()

    act(() => renderer.root.findByProps({ 'data-testid': 'verify-use-link' }).props.onClick())
    expect(renderer.root.findByProps({ 'data-testid': 'verify-link-submit' })).toBeTruthy()
  })
})

describe('VerifyEmailPage · 验证码模式', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('无 token 时进入验证码模式，邮箱来自 query', async () => {
    const renderer = await renderVerify('/verify-email?email=a%40b.com&return_to=%2F')

    expect(renderer.root.findByProps({ 'data-testid': 'verify-email-input' }).props.value).toBe(
      'a@b.com',
    )
    expect(renderer.root.findByProps({ 'data-testid': 'verify-code-input' })).toBeTruthy()
  })

  it('输入 6 位验证码后提交 POST /auth/email/verify/code', async () => {
    let received: unknown = null
    mockServer.use(
      http.post(verifyCodeUrl, async ({ request }) => {
        received = await request.json()
        return createSuccessResponse({ user_id: 'user-1' })
      }),
    )
    meWith(true)

    const renderer = await renderVerify('/verify-email?email=a%40b.com&return_to=%2F')
    act(() => {
      renderer.root
        .findByProps({ 'data-testid': 'verify-code-input' })
        .props.onChange({ target: { value: '12a3456' } })
    })
    await submit(renderer)

    expect(received).toEqual({ email: 'a@b.com', code: '123456', login_from: 'web' })
    expect(renderer.root.findByProps({ 'data-testid': 'home-landed' })).toBeTruthy()
  })

  it('重发按钮 POST /auth/email/resend 并给出成功状态', async () => {
    let received: unknown = null
    mockServer.use(
      http.post(resendUrl, async ({ request }) => {
        received = await request.json()
        return createNoContentResponse()
      }),
    )

    const renderer = await renderVerify('/verify-email?email=a%40b.com&return_to=%2F')
    await act(async () => {
      renderer.root.findByProps({ 'data-testid': 'verify-resend' }).props.onClick()
    })

    expect(received).toEqual({ email: 'a@b.com' })
    expect(renderer.root.findByProps({ 'data-testid': 'verify-resent' })).toBeTruthy()
  })

  it('重发失败按错误码给不同文案：无 pending / 邮箱已注册', async () => {
    mockServer.use(http.post(resendUrl, () => createErrorResponse(200, 'NO_PENDING', 106016)))
    const renderer = await renderVerify('/verify-email?email=a%40b.com&return_to=%2F')
    await act(async () => {
      renderer.root.findByProps({ 'data-testid': 'verify-resend' }).props.onClick()
    })
    expect(JSON.stringify(renderer.toJSON())).toContain('未找到待验证的注册')

    mockServer.use(http.post(resendUrl, () => createErrorResponse(200, 'EMAIL_TAKEN', 106012)))
    await act(async () => {
      renderer.root.findByProps({ 'data-testid': 'verify-resend' }).props.onClick()
    })
    expect(JSON.stringify(renderer.toJSON())).toContain('该邮箱已注册')
  })

  it('邮箱非法时不能提交也不能重发', async () => {
    const renderer = await renderVerify('/verify-email?email=not-an-email&return_to=%2F')

    expect(renderer.root.findByProps({ 'data-testid': 'verify-code-submit' }).props.disabled).toBe(
      true,
    )
    expect(renderer.root.findByProps({ 'data-testid': 'verify-resend' }).props.disabled).toBe(true)
  })
})
