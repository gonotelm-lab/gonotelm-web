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
const verifyCodeUrl = 'http://127.0.0.1:4173/api/v1/auth/email/verify/code'
const resendUrl = 'http://127.0.0.1:4173/api/v1/auth/email/resend'

const renderVerify = async (entry = '/verify-email?email=a%40b.com&return_to=%2F') => {
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

const fillInput = (renderer: ReactTestRenderer, testId: string, value: string) => {
  act(() => {
    renderer.root.findByProps({ 'data-testid': testId }).props.onChange({ target: { value } })
  })
}

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

const textOf = (renderer: ReactTestRenderer) => JSON.stringify(renderer.toJSON())

describe('VerifyEmailPage · 验证码', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('邮箱来自 query，只有验证码一种形态（没有邮件链接入口）', async () => {
    const renderer = await renderVerify('/verify-email?email=a%40b.com&return_to=%2F')

    expect(renderer.root.findByProps({ 'data-testid': 'verify-email-input' }).props.value).toBe(
      'a@b.com',
    )
    expect(renderer.root.findByProps({ 'data-testid': 'verify-code-input' })).toBeTruthy()
    // 链接验证已下线：页面上不该再出现链接模式的按钮
    expect(renderer.root.findAllByProps({ 'data-testid': 'verify-link-submit' })).toHaveLength(0)
    expect(renderer.root.findAllByProps({ 'data-testid': 'verify-use-code' })).toHaveLength(0)
    expect(renderer.root.findAllByProps({ 'data-testid': 'verify-use-link' })).toHaveLength(0)
  })

  it('输入 6 位验证码后提交 POST /auth/email/verify/code，并回到 return_to', async () => {
    let received: unknown = null
    mockServer.use(
      http.post(verifyCodeUrl, async ({ request }) => {
        received = await request.json()
        return createSuccessResponse({ user_id: 'user-1' })
      }),
    )
    meWith(true)

    const renderer = await renderVerify()
    fillInput(renderer, 'verify-code-input', '12a3456')
    await submit(renderer)

    // 逐位收敛成纯数字再提交
    expect(received).toEqual({ email: 'a@b.com', code: '123456', login_from: 'web' })
    expect(renderer.root.findByProps({ 'data-testid': 'home-landed' })).toBeTruthy()
  })

  it('验证后 has_password 为 false（跨设备验证）时转到设置密码页', async () => {
    mockServer.use(http.post(verifyCodeUrl, () => createSuccessResponse({ user_id: 'user-1' })))
    meWith(false)

    const renderer = await renderVerify()
    fillInput(renderer, 'verify-code-input', '123456')
    await submit(renderer)

    expect(renderer.root.findByProps({ 'data-testid': 'set-password-landed' })).toBeTruthy()
  })

  it('106016 / 106018 / 106017 各有专门文案', async () => {
    const renderer = await renderVerify()

    mockServer.use(
      http.post(verifyCodeUrl, () => createErrorResponse(200, 'VERIFY_EXPIRED', 106016)),
    )
    fillInput(renderer, 'verify-code-input', '123456')
    await submit(renderer)
    expect(textOf(renderer)).toContain('已失效')

    mockServer.use(
      http.post(verifyCodeUrl, () => createErrorResponse(200, 'CODE_MISMATCH', 106018)),
    )
    await submit(renderer)
    expect(textOf(renderer)).toContain('验证码不正确')

    mockServer.use(
      http.post(verifyCodeUrl, () => createErrorResponse(200, 'ATTEMPTS', 106017)),
    )
    await submit(renderer)
    expect(textOf(renderer)).toContain('尝试次数过多')
  })

  it('重发按钮 POST /auth/email/resend 并给出成功状态', async () => {
    let received: unknown = null
    mockServer.use(
      http.post(resendUrl, async ({ request }) => {
        received = await request.json()
        return createNoContentResponse()
      }),
    )

    const renderer = await renderVerify()
    await submit(renderer, 'verify-resend')

    expect(received).toEqual({ email: 'a@b.com' })
    expect(renderer.root.findByProps({ 'data-testid': 'verify-resent' })).toBeTruthy()
  })

  it('重发失败按错误码给不同文案：无 pending / 邮箱已注册', async () => {
    mockServer.use(http.post(resendUrl, () => createErrorResponse(200, 'NO_PENDING', 106016)))
    const renderer = await renderVerify()
    await submit(renderer, 'verify-resend')
    expect(textOf(renderer)).toContain('未找到待验证的注册')

    mockServer.use(http.post(resendUrl, () => createErrorResponse(200, 'EMAIL_TAKEN', 106012)))
    await submit(renderer, 'verify-resend')
    expect(textOf(renderer)).toContain('该邮箱已注册')
  })

  it('邮箱非法时不能提交也不能重发', async () => {
    const renderer = await renderVerify('/verify-email?email=not-an-email&return_to=%2F')

    expect(renderer.root.findByProps({ 'data-testid': 'verify-code-submit' }).props.disabled).toBe(
      true,
    )
    expect(renderer.root.findByProps({ 'data-testid': 'verify-resend' }).props.disabled).toBe(true)
  })
})
