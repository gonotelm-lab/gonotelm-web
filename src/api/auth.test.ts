import { afterEach, describe, expect, it, vi } from 'vitest'
import { http } from 'msw'
import { mockServer } from '@/test/mocks'
import { createNoContentResponse } from '@/test/mocks/handlers/httpResponse'
import {
  buildAuthLoginPath,
  buildAuthLoginUrl,
  buildBindIdentityPath,
  getAuthProviders,
  logout,
  passwordLogin,
  registerEmail,
  resendVerificationEmail,
  setPassword,
  verifyEmailCode,
  verifyEmailToken,
} from './auth'

describe('buildAuthLoginPath', () => {
  it('login_provider / login_from 走 query', () => {
    expect(buildAuthLoginPath({ provider: 'github', from: 'web' })).toBe(
      '/api/v1/auth/login?login_provider=github&login_from=web',
    )
  })

  it('return_to 存在时追加并做 URL 编码', () => {
    expect(
      buildAuthLoginPath({ provider: 'github', from: 'web', returnTo: '/notebook/a b' }),
    ).toBe(
      '/api/v1/auth/login?login_provider=github&login_from=web&return_to=%2Fnotebook%2Fa+b',
    )
  })

  it('return_to 为空时不出现在 query 里', () => {
    expect(buildAuthLoginPath({ provider: 'github', from: 'web', returnTo: '' })).toBe(
      '/api/v1/auth/login?login_provider=github&login_from=web',
    )
  })
})

describe('buildAuthLoginUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('return_to 带上前端 origin', () => {
    vi.stubGlobal('window', { location: { origin: 'http://127.0.0.1:5173' } })
    expect(
      buildAuthLoginUrl({ provider: 'github', from: 'web', returnTo: '/notebook/n-1' }),
    ).toBe(
      'http://127.0.0.1:4173/api/v1/auth/login?login_provider=github&login_from=web&return_to=http%3A%2F%2F127.0.0.1%3A5173%2Fnotebook%2Fn-1',
    )
  })

  it('未传 return_to 时落到前端根路径而不是裸 /', () => {
    vi.stubGlobal('window', { location: { origin: 'http://127.0.0.1:5173' } })
    expect(buildAuthLoginUrl({ provider: 'github', from: 'web' })).toBe(
      'http://127.0.0.1:4173/api/v1/auth/login?login_provider=github&login_from=web&return_to=http%3A%2F%2F127.0.0.1%3A5173%2F',
    )
  })
})

describe('auth api', () => {
  it('getAuthProviders 解析 providers', async () => {
    await expect(getAuthProviders()).resolves.toEqual({
      providers: [{ name: 'github' }, { name: 'google' }],
    })
  })

  it('logout 返回 null', async () => {
    await expect(logout()).resolves.toBeNull()
  })
})

const apiBaseUrl = 'http://127.0.0.1:4173'

/** 捕获一次请求的 method / path / body，用来断言前端发的契约形态。 */
async function captureRequest(path: string) {
  const captured: { method: string; path: string; body: unknown } = {
    method: '',
    path: '',
    body: null,
  }
  mockServer.use(
    http.all(`${apiBaseUrl}${path}`, async ({ request }) => {
      captured.method = request.method
      captured.path = new URL(request.url).pathname
      captured.body = request.body ? await request.json().catch(() => null) : null
      return createNoContentResponse()
    }),
  )
  return captured
}

describe('邮箱口令登录', () => {
  it('POST /auth/login，body 带 email/password 且固定 login_from=web', async () => {
    const captured = await captureRequest('/api/v1/auth/login')
    await expect(passwordLogin({ email: 'a@b.com', password: 'secret-123' })).resolves.toBeNull()
    expect(captured.method).toBe('POST')
    expect(captured.body).toEqual({ email: 'a@b.com', password: 'secret-123', login_from: 'web' })
  })

  it('调用方显式给出的 login_from 优先', async () => {
    const captured = await captureRequest('/api/v1/auth/login')
    await passwordLogin({ email: 'a@b.com', password: 'secret-123', login_from: 'web' })
    expect(captured.body).toEqual({ email: 'a@b.com', password: 'secret-123', login_from: 'web' })
  })
})

describe('邮箱注册与验证', () => {
  it('registerEmail POST /auth/email/register', async () => {
    const captured = await captureRequest('/api/v1/auth/email/register')
    await expect(registerEmail({ email: 'a@b.com', password: 'secret-123' })).resolves.toBeNull()
    expect(captured.method).toBe('POST')
    expect(captured.body).toEqual({ email: 'a@b.com', password: 'secret-123' })
  })

  it('verifyEmailToken POST /auth/email/verify，只带 token', async () => {
    const captured = await captureRequest('/api/v1/auth/email/verify')
    await expect(verifyEmailToken({ token: 'tok-1' })).resolves.toBeNull()
    expect(captured.body).toEqual({ token: 'tok-1' })
  })

  it('verifyEmailCode POST /auth/email/verify/code', async () => {
    const captured = await captureRequest('/api/v1/auth/email/verify/code')
    await expect(verifyEmailCode({ email: 'a@b.com', code: '123456' })).resolves.toBeNull()
    expect(captured.body).toEqual({ email: 'a@b.com', code: '123456' })
  })

  it('resendVerificationEmail POST /auth/email/resend', async () => {
    const captured = await captureRequest('/api/v1/auth/email/resend')
    await expect(resendVerificationEmail({ email: 'a@b.com' })).resolves.toBeNull()
    expect(captured.body).toEqual({ email: 'a@b.com' })
  })
})

describe('口令设置', () => {
  it('无口令时只发 new_password', async () => {
    const captured = await captureRequest('/api/v1/auth/password')
    await expect(setPassword({ new_password: 'secret-123' })).resolves.toBeNull()
    expect(captured.method).toBe('PUT')
    expect(captured.body).toEqual({ new_password: 'secret-123' })
  })

  it('已有口令时带 old_password', async () => {
    const captured = await captureRequest('/api/v1/auth/password')
    await setPassword({ old_password: 'old-12345', new_password: 'secret-123' })
    expect(captured.body).toEqual({ old_password: 'old-12345', new_password: 'secret-123' })
  })
})

describe('buildBindIdentityPath', () => {
  it('把 provider 编进路径', () => {
    expect(buildBindIdentityPath('github')).toBe('/api/v1/auth/identities/github/bind')
    expect(buildBindIdentityPath('we ird')).toBe('/api/v1/auth/identities/we%20ird/bind')
  })
})
