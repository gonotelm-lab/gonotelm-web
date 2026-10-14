import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { http, delay } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockServer } from '@/test/mocks'
import {
  createErrorResponse,
  createNoContentResponse,
  createSuccessResponse,
} from '@/test/mocks/handlers/httpResponse'
import { ME_QUERY_KEY } from '@/components/auth/useMeQuery'
import { ResetPasswordPage } from './ResetPasswordPage'

const requestUrl = 'http://127.0.0.1:4173/api/v1/auth/password/reset'
const linkUrl = 'http://127.0.0.1:4173/api/v1/auth/password/reset/verify'
const prefetchUrl = 'http://127.0.0.1:4173/api/v1/auth/prefetch'

/** 记录落地路径与 query，用来断言重置成功后确实回了登录页。 */
function Landed({ testId }: { testId: string }) {
  const location = useLocation()
  return <div data-testid={testId}>{`${location.pathname}${location.search}`}</div>
}

/** 最后一次渲染用的 client：用来断言「重置后 me 缓存被清掉」。 */
let queryClientRef: QueryClient | null = null

const renderPage = async (entry = '/reset-password') => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClientRef = queryClient
  let renderer!: ReactTestRenderer
  await act(async () => {
    renderer = create(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[entry]}>
          <Routes>
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/login" element={<Landed testId="login-landed" />} />
            <Route path="/notebook/n-1" element={<Landed testId="notebook-landed" />} />
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

const click = async (renderer: ReactTestRenderer, testId: string) => {
  await act(async () => {
    renderer.root.findByProps({ 'data-testid': testId }).props.onClick()
  })
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

const textOf = (renderer: ReactTestRenderer) => JSON.stringify(renderer.toJSON())

const landedAt = (renderer: ReactTestRenderer, testId: string) =>
  renderer.root.findByProps({ 'data-testid': testId }).children.join('')

/** 链接模式：token 只从片段/query 读，这里统一用片段形式。 */
const stubLink = (hash = '#token=tok-1', search = '') => {
  vi.stubGlobal('window', {
    location: { hash, search, origin: 'http://localhost' },
  })
}

const fillNewPassword = (renderer: ReactTestRenderer, value = 'secret-123') => {
  fillInput(renderer, 'reset-password-new-input', value)
  fillInput(renderer, 'reset-password-confirm-input', value)
}

describe('ResetPasswordPage · 发起找回', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('提交合法邮箱：POST 归一化地址，且成功提示不判断账号是否存在', async () => {
    let received: unknown = null
    mockServer.use(
      http.post(requestUrl, async ({ request }) => {
        received = await request.json()
        return createNoContentResponse()
      }),
    )

    const renderer = await renderPage()
    fillInput(renderer, 'reset-email-input', '  Foo@Bar.com ')
    await submitForm(renderer)

    expect(received).toEqual({ email: 'foo@bar.com' })
    expect(renderer.root.findByProps({ 'data-testid': 'reset-request-sent' })).toBeTruthy()
    // 防账号枚举：文案只说「如果已注册」，绝不能出现「该邮箱未注册」这类判断。
    // 保留中性前缀（防枚举），但不再把有效期/一次性这些细节复述一遍——邮件里已经写了
    expect(textOf(renderer)).toContain('如果该邮箱已注册')
    expect(textOf(renderer)).toContain('请查收')
  })

  it('邮箱非法时点击不发请求，就地报错', async () => {
    let calls = 0
    mockServer.use(
      http.post(requestUrl, () => {
        calls += 1
        return createNoContentResponse()
      }),
    )

    const renderer = await renderPage()
    fillInput(renderer, 'reset-email-input', 'not-an-email')
    await submitForm(renderer)

    expect(calls).toBe(0)
    expect(textOf(renderer)).toContain('邮箱格式不正确')
  })

  it('106026 邮件发送失败与 106021 限流各有专门文案', async () => {
    mockServer.use(
      http.post(requestUrl, () => createErrorResponse(200, 'MAIL_FAILED', 106026)),
    )
    const renderer = await renderPage()
    fillInput(renderer, 'reset-email-input', 'a@b.com')
    await submitForm(renderer)
    expect(textOf(renderer)).toContain('邮件发送失败')

    mockServer.use(
      http.post(requestUrl, () => createErrorResponse(200, 'TOO_MANY', 106021)),
    )
    await submitForm(renderer)
    expect(textOf(renderer)).toContain('尝试过于频繁')
  })

  it('页面上没有任何验证码入口（后端已下线验证码确认）', async () => {
    const renderer = await renderPage()

    expect(renderer.root.findAllByProps({ 'data-testid': 'reset-code-input' })).toHaveLength(0)
    expect(renderer.root.findAllByProps({ 'data-testid': 'reset-use-code' })).toHaveLength(0)
    expect(textOf(renderer)).not.toContain('验证码')
  })
})

describe('ResetPasswordPage · 邮件链接模式', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('打开链接页不消费 token：必须用户点「重置密码」才 POST', async () => {
    stubLink()
    let calls = 0
    mockServer.use(
      http.post(linkUrl, () => {
        calls += 1
        return createSuccessResponse({ relogin_required: true })
      }),
    )

    const renderer = await renderPage()

    // 邮件网关/预览器预取的是静态页，这里断言只挂载不发请求，否则 token 会被提前烧掉。
    expect(calls).toBe(0)
    expect(renderer.root.findByProps({ 'data-testid': 'reset-submit' })).toBeTruthy()
    expect(renderer.root.findByProps({ 'data-testid': 'reset-password-new-input' })).toBeTruthy()
  })

  it('提交 token + 新密码，落回登录页并清掉 me 缓存', async () => {
    stubLink()
    let received: unknown = null
    mockServer.use(
      http.post(linkUrl, async ({ request }) => {
        received = await request.json()
        return createSuccessResponse({ relogin_required: true })
      }),
    )

    const renderer = await renderPage()
    // 模拟「登录态下顺手改密码」：旧的成功数据必须被清掉，否则登录页会拿它弹回应用。
    queryClientRef?.setQueryData(ME_QUERY_KEY, { user_id: 'user-1' })

    fillNewPassword(renderer)
    await submitForm(renderer)

    expect(received).toEqual({ token: 'tok-1', new_password: 'secret-123' })
    expect(landedAt(renderer, 'login-landed')).toContain('notice=password_reset')
    expect(queryClientRef?.getQueryData(ME_QUERY_KEY)).toBeUndefined()
  })

  it('relogin_required 为 false（会话还在）时回 return_to，而不是去登录页', async () => {
    stubLink()
    mockServer.use(
      http.post(linkUrl, () => createSuccessResponse({ relogin_required: false })),
    )

    const renderer = await renderPage('/reset-password?return_to=%2Fnotebook%2Fn-1#token=tok-1')
    queryClientRef?.setQueryData(ME_QUERY_KEY, { user_id: 'user-1' })
    fillNewPassword(renderer)
    await submitForm(renderer)

    expect(renderer.root.findByProps({ 'data-testid': 'notebook-landed' })).toBeTruthy()
    expect(renderer.root.findAllByProps({ 'data-testid': 'login-landed' })).toHaveLength(0)
    // 会话没被作废，me 只是变陈旧（invalidate），不能整条删掉
    expect(queryClientRef?.getQueryData(ME_QUERY_KEY)).toBeDefined()
  })

  it('106016 映射为「链接已失效或已被使用」', async () => {
    stubLink()
    mockServer.use(http.post(linkUrl, () => createErrorResponse(200, 'RESET_EXPIRED', 106016)))

    const renderer = await renderPage()
    fillNewPassword(renderer)
    await submitForm(renderer)

    renderer.root.findByProps({ 'data-testid': 'reset-error' })
    expect(textOf(renderer)).toContain('已失效或已被使用')
  })

  it('106014 用口令策略文案，未知错误码回退到通用失败文案', async () => {
    stubLink()
    mockServer.use(http.post(linkUrl, () => createErrorResponse(200, 'WEAK', 106014)))
    const renderer = await renderPage()
    fillNewPassword(renderer)
    await submitForm(renderer)
    // 客户端已按同一策略拦过一遍；这里锁住「后端仍然打回时」的文案
    expect(textOf(renderer)).toContain('密码不符合要求')

    mockServer.use(http.post(linkUrl, () => createErrorResponse(500, 'BOOM', 500_001)))
    await submitForm(renderer)
    expect(textOf(renderer)).toContain('密码重置失败，请重试')
  })

  it('新密码不符合策略时不发请求（服务端要求复杂密码时清单实时标出缺哪条）', async () => {
    stubLink()
    let calls = 0
    mockServer.use(
      http.get(prefetchUrl, () => createSuccessResponse({ require_complex_password: true })),
      http.post(linkUrl, () => {
        calls += 1
        return createSuccessResponse({ relogin_required: true })
      }),
    )

    const renderer = await renderPage()
    fillNewPassword(renderer, 'password123')
    await submitForm(renderer)

    expect(calls).toBe(0)
    const hintMet = (key: string) => {
      const row = renderer.root.findAll(
        (node) =>
          typeof node.type === 'string' &&
          node.props['data-testid'] === `reset-password-hints-${key}`,
      )[0]
      return String(row?.props['data-met'])
    }
    expect(hintMet('length')).toBe('true')
    expect(hintMet('digit')).toBe('true')
    // 缺的是大写字母：输到一半就该看见，而不是点提交才知道
    expect(hintMet('upper')).toBe('false')
  })

  it('两次密码不一致时不发请求', async () => {
    stubLink()
    let calls = 0
    mockServer.use(
      http.post(linkUrl, () => {
        calls += 1
        return createSuccessResponse({ relogin_required: true })
      }),
    )

    const renderer = await renderPage()
    fillInput(renderer, 'reset-password-new-input', 'secret-123')
    fillInput(renderer, 'reset-password-confirm-input', 'secret-124')
    await submitForm(renderer)

    expect(calls).toBe(0)
    expect(textOf(renderer)).toContain('两次输入的密码不一致')
  })

  it('token 也可从 query 兜底读出', async () => {
    stubLink('', '?token=tok-9')
    let received: unknown = null
    mockServer.use(
      http.post(linkUrl, async ({ request }) => {
        received = await request.json()
        return createSuccessResponse({ relogin_required: true })
      }),
    )

    const renderer = await renderPage()
    fillNewPassword(renderer)
    await submitForm(renderer)

    expect(received).toEqual({ token: 'tok-9', new_password: 'secret-123' })
  })

  it('无 token 时落在发起模式，不渲染口令表单', async () => {
    const renderer = await renderPage()

    expect(renderer.root.findByProps({ 'data-testid': 'reset-email-input' })).toBeTruthy()
    expect(renderer.root.findAllByProps({ 'data-testid': 'reset-submit' })).toHaveLength(0)
  })

  it('链接失效后仍有出路：点「重新发送重置邮件」回到发起模式', async () => {
    stubLink()

    const renderer = await renderPage()
    await click(renderer, 'reset-resend')

    expect(renderer.root.findByProps({ 'data-testid': 'reset-request-submit' })).toBeTruthy()
    expect(renderer.root.findAllByProps({ 'data-testid': 'reset-submit' })).toHaveLength(0)
    // 回到发起表单后也不该冒出验证码入口
    expect(renderer.root.findAllByProps({ 'data-testid': 'reset-code-input' })).toHaveLength(0)
  })
})

describe('ResetPasswordPage · 进页面先取密码策略', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('走共用的 /auth/prefetch，且拿到的策略直接驱动表单', async () => {
    stubLink()
    let policyCalls = 0
    mockServer.use(
      http.get(prefetchUrl, () => {
        policyCalls += 1
        return createSuccessResponse({ require_complex_password: true })
      }),
    )

    const renderer = await renderPage()

    expect(policyCalls).toBe(1)
    // 服务端要求复杂密码 → 清单四条（长度 + 大写 + 小写 + 数字）立即生效
    expect(renderer.root.findByProps({ 'data-testid': 'reset-password-hints' })).toBeTruthy()
    expect(
      renderer.root.findByProps({ 'data-testid': 'reset-password-hints-upper' }),
    ).toBeTruthy()
  })

  it('策略还没回来时不渲染口令表单，回来后才出现', async () => {
    stubLink()
    mockServer.use(
      http.get(prefetchUrl, async () => {
        await delay(40)
        return createSuccessResponse({ require_complex_password: false })
      }),
    )

    const renderer = await renderPage()

    expect(renderer.root.findByProps({ 'data-testid': 'reset-policy-loading' })).toBeTruthy()
    expect(
      renderer.root.findAllByProps({ 'data-testid': 'reset-password-new-input' }),
    ).toHaveLength(0)

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60))
    })

    expect(renderer.root.findByProps({ 'data-testid': 'reset-password-new-input' })).toBeTruthy()
    expect(renderer.root.findAllByProps({ 'data-testid': 'reset-policy-loading' })).toHaveLength(0)
  })

  it('发起模式没有口令字段，策略没回来也先让用户填邮箱', async () => {
    mockServer.use(
      http.get(prefetchUrl, async () => {
        await delay(40)
        return createSuccessResponse({ require_complex_password: false })
      }),
    )

    const renderer = await renderPage()

    expect(renderer.root.findByProps({ 'data-testid': 'reset-email-input' })).toBeTruthy()
    expect(renderer.root.findAllByProps({ 'data-testid': 'reset-policy-loading' })).toHaveLength(0)
  })
})
