import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { http } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockServer } from '@/test/mocks'
import {
  createErrorResponse,
  createNoContentResponse,
} from '@/test/mocks/handlers/httpResponse'
import { SignupPage } from './SignupPage'

const meUrl = 'http://127.0.0.1:4173/api/v1/user/me'
const registerUrl = 'http://127.0.0.1:4173/api/v1/auth/email/register'

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

  it('渲染邮箱/口令/确认三个输入，未填完时不可提交', async () => {
    const renderer = await renderSignup()

    expect(renderer.root.findByProps({ 'data-testid': 'signup-email-input' })).toBeTruthy()
    expect(renderer.root.findByProps({ 'data-testid': 'signup-password-input' })).toBeTruthy()
    expect(renderer.root.findByProps({ 'data-testid': 'signup-confirm-input' })).toBeTruthy()
    expect(submitDisabled(renderer)).toBe(true)

    fillInput(renderer, 'signup-email-input', 'a@b.com')
    fillInput(renderer, 'signup-password-input', 'short')
    fillInput(renderer, 'signup-confirm-input', 'short')
    expect(submitDisabled(renderer)).toBe(true)

    fillInput(renderer, 'signup-password-input', 'long-enough')
    fillInput(renderer, 'signup-confirm-input', 'long-enough')
    expect(submitDisabled(renderer)).toBe(false)
  })

  it('两次口令不一致时给出提示且仍不可提交', async () => {
    const renderer = await renderSignup()

    fillInput(renderer, 'signup-email-input', 'a@b.com')
    fillInput(renderer, 'signup-password-input', 'long-enough')
    fillInput(renderer, 'signup-confirm-input', 'long-enough-2')

    expect(JSON.stringify(renderer.toJSON())).toContain('两次输入的口令不一致')
    expect(submitDisabled(renderer)).toBe(true)
  })

  it('注册成功：POST 归一化邮箱与口令，并跳到验证页', async () => {
    let received: unknown = null
    mockServer.use(
      http.post(registerUrl, async ({ request }) => {
        received = await request.json()
        return createNoContentResponse()
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
})
