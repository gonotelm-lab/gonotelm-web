import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { http } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockServer } from '@/test/mocks'
import {
  createErrorResponse,
  createNoContentResponse,
  createSuccessResponse,
} from '@/test/mocks/handlers/httpResponse'
import { ME_QUERY_KEY } from '@/components/auth/useMeQuery'
import { SetPasswordPage } from './SetPasswordPage'

const meUrl = 'http://127.0.0.1:4173/api/v1/user/me'
const passwordUrl = 'http://127.0.0.1:4173/api/v1/auth/password'
const prefetchUrl = 'http://127.0.0.1:4173/api/v1/auth/email/register/prefetch'

const useMe = (hasPassword: boolean) =>
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

/** 密码保存后不再回到 return_to，而是回登录页重新登录（会话已被作废）。 */
const useSetPasswordOk = () =>
  mockServer.use(
    http.put(passwordUrl, () => createSuccessResponse({ relogin_required: true })),
  )

/** 记录落地路径与 query，用来断言跳转目标（MemoryRouter 不改 window.location）。 */
function Landed({ testId }: { testId: string }) {
  const location = useLocation()
  return <div data-testid={testId}>{`${location.pathname}${location.search}`}</div>
}

/** 最后一次渲染用的 client：用来断言「会话失效后 me 缓存被清掉」。 */
let queryClientRef: QueryClient | null = null

const renderPage = async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClientRef = queryClient
  let renderer!: ReactTestRenderer
  await act(async () => {
    renderer = create(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/set-password?return_to=%2Fnotebook%2Fn-1']}>
          <Routes>
            <Route path="/set-password" element={<SetPasswordPage />} />
            <Route path="/notebook/:id" element={<Landed testId="notebook-landed" />} />
            <Route path="/login" element={<Landed testId="login-landed" />} />
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

describe('SetPasswordPage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('无密码时只要求新密码与确认，且不发 old_password', async () => {
    useMe(false)
    let received: unknown = null
    mockServer.use(
      http.put(passwordUrl, async ({ request }) => {
        received = await request.json()
        return createSuccessResponse({ relogin_required: true })
      }),
    )

    const renderer = await renderPage()
    expect(() => renderer.root.findByProps({ 'data-testid': 'set-password-current-input' })).toThrow()

    fillInput(renderer, 'set-password-new-input', 'secret-123')
    fillInput(renderer, 'set-password-confirm-input', 'secret-123')
    await submitForm(renderer)

    expect(received).toEqual({ new_password: 'secret-123' })
  })

  it('保存成功后不留在原页面：回登录页并带 notice=password_changed', async () => {
    useMe(false)
    useSetPasswordOk()

    const renderer = await renderPage()
    fillInput(renderer, 'set-password-new-input', 'secret-123')
    fillInput(renderer, 'set-password-confirm-input', 'secret-123')
    await submitForm(renderer)

    // 后端作废了全部会话（含当前），所以不能再回 return_to。
    expect(() => renderer.root.findByProps({ 'data-testid': 'notebook-landed' })).toThrow()
    const landed = renderer.root.findByProps({ 'data-testid': 'login-landed' })
    expect(landed.children.join('')).toContain('notice=password_changed')
    expect(landed.children.join('')).toContain('return_to=')
    // 关键：缓存的 me 必须被清掉。否则登录页会拿旧的成功数据把用户又弹回受保护页面。
    expect(queryClientRef?.getQueryData(ME_QUERY_KEY)).toBeUndefined()
  })

  it('已有密码时要求当前密码并随请求发送', async () => {
    useMe(true)
    let received: unknown = null
    mockServer.use(
      http.put(passwordUrl, async ({ request }) => {
        received = await request.json()
        return createSuccessResponse({ relogin_required: true })
      }),
    )

    const renderer = await renderPage()
    expect(renderer.root.findByProps({ 'data-testid': 'set-password-current-input' })).toBeTruthy()
    expect(JSON.stringify(renderer.toJSON())).toContain('修改密码')

    fillInput(renderer, 'set-password-current-input', 'old-12345')
    fillInput(renderer, 'set-password-new-input', 'secret-123')
    fillInput(renderer, 'set-password-confirm-input', 'secret-123')
    await submitForm(renderer)

    expect(received).toEqual({ old_password: 'old-12345', new_password: 'secret-123' })
  })

  it('未填当前密码时按钮仍可点，点击只报错不发请求', async () => {
    useMe(true)
    let sent: unknown = null
    mockServer.use(
      http.put(passwordUrl, async ({ request }) => {
        sent = await request.json()
        return createSuccessResponse({ relogin_required: true })
      }),
    )

    const renderer = await renderPage()
    fillInput(renderer, 'set-password-new-input', 'secret-123')
    fillInput(renderer, 'set-password-confirm-input', 'secret-123')

    // 按钮不再被校验结果禁用
    expect(renderer.root.findByProps({ 'data-testid': 'set-password-submit' }).props.disabled).toBe(
      false,
    )

    await submitForm(renderer)
    expect(sent).toBeNull()
    expect(JSON.stringify(renderer.toJSON())).toContain('请输入当前密码')
  })

  it('三个密码框都有眼睛，切换显隐不会顺手提交表单', async () => {
    useMe(true)
    let sent: unknown = null
    mockServer.use(
      http.put(passwordUrl, async ({ request }) => {
        sent = await request.json()
        return createSuccessResponse({ relogin_required: true })
      }),
    )

    const renderer = await renderPage()
    const typeOf = (testId: string) =>
      renderer.root.findByProps({ 'data-testid': testId }).props.type ?? 'text'
    const toggle = (testId: string) =>
      act(() => {
        renderer.root.findByProps({ 'data-testid': testId }).props.onClick()
      })

    expect(typeOf('set-password-current-input')).toBe('password')
    expect(typeOf('set-password-new-input')).toBe('password')
    expect(typeOf('set-password-confirm-input')).toBe('password')

    toggle('set-password-current-visibility')
    toggle('set-password-new-visibility')
    toggle('set-password-confirm-visibility')

    expect(typeOf('set-password-current-input')).toBe('text')
    expect(typeOf('set-password-new-input')).toBe('text')
    expect(typeOf('set-password-confirm-input')).toBe('text')
    expect(sent).toBeNull()
  })

  it('服务端要求复杂密码时：清单随输入实时刷新，不符合时点击不发请求', async () => {
    useMe(false)
    let sent: unknown = null
    mockServer.use(
      http.get(prefetchUrl, () => createSuccessResponse({ require_complex_password: true })),
      http.put(passwordUrl, async ({ request }) => {
        sent = await request.json()
        return createSuccessResponse({ relogin_required: true })
      }),
    )

    const renderer = await renderPage()
    const hintMet = (key: string) => {
      const row = renderer.root.findAll(
        (node) =>
          typeof node.type === 'string' &&
          node.props['data-testid'] === `set-password-hints-${key}`,
      )[0]
      return String(row?.props['data-met'])
    }

    fillInput(renderer, 'set-password-new-input', 'password123')
    fillInput(renderer, 'set-password-confirm-input', 'password123')

    // 还没点保存，清单就已经标出缺的是大写
    expect(hintMet('length')).toBe('true')
    expect(hintMet('digit')).toBe('true')
    expect(hintMet('upper')).toBe('false')

    await submitForm(renderer)
    expect(sent).toBeNull()

    fillInput(renderer, 'set-password-new-input', 'Password123')
    fillInput(renderer, 'set-password-confirm-input', 'Password123')
    expect(hintMet('upper')).toBe('true')

    await submitForm(renderer)
    expect(sent).toEqual({ new_password: 'Password123' })
  })

  it('106011 映射为「当前密码不正确」', async () => {
    useMe(true)
    mockServer.use(
      http.put(passwordUrl, () => createErrorResponse(200, 'INVALID_CREDENTIALS', 106011)),
    )

    const renderer = await renderPage()
    fillInput(renderer, 'set-password-current-input', 'wrong-123')
    fillInput(renderer, 'set-password-new-input', 'secret-123')
    fillInput(renderer, 'set-password-confirm-input', 'secret-123')
    await submitForm(renderer)

    renderer.root.findByProps({ 'data-testid': 'set-password-error' })
    expect(JSON.stringify(renderer.toJSON())).toContain('当前密码不正确')
  })

  it('106025（新密码与当前相同）映射为专门文案', async () => {
    useMe(true)
    mockServer.use(
      http.put(passwordUrl, () => createErrorResponse(200, 'PASSWORD_UNCHANGED', 106025)),
    )

    const renderer = await renderPage()
    fillInput(renderer, 'set-password-current-input', 'same-1234')
    fillInput(renderer, 'set-password-new-input', 'same-1234')
    fillInput(renderer, 'set-password-confirm-input', 'same-1234')
    await submitForm(renderer)

    renderer.root.findByProps({ 'data-testid': 'set-password-error' })
    expect(JSON.stringify(renderer.toJSON())).toContain('新密码不能与当前密码相同')
  })

  it('「稍后再说」不写密码直接回到 return_to', async () => {
    useMe(false)
    let putCalls = 0
    mockServer.use(
      http.put(passwordUrl, () => {
        putCalls += 1
        return createNoContentResponse()
      }),
    )

    const renderer = await renderPage()
    await act(async () => {
      renderer.root.findByProps({ 'data-testid': 'set-password-skip' }).props.onClick()
    })

    expect(putCalls).toBe(0)
    expect(renderer.root.findByProps({ 'data-testid': 'notebook-landed' })).toBeTruthy()
  })
})
