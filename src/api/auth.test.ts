import { afterEach, describe, expect, it, vi } from 'vitest'
import { http } from 'msw'
import { mockServer } from '@/test/mocks'
import { ApiError } from '@/lib/http'
import { recallAuthReturn } from '@/lib/auth'
import {
  createNoContentResponse,
  createSuccessResponse,
} from '@/test/mocks/handlers/httpResponse'
import {
  AUTH_BIND_IDENTITY_PATH,
  buildAuthLoginPath,
  buildAuthLoginUrl,
  getAuthProviders,
  logout,
  passwordLogin,
  registerEmail,
  resendVerificationEmail,
  setPassword,
  startIdentityBind,
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
  it('POST /auth/email/login，body 带 email/password 且固定 login_from=web，成功返回 user_id', async () => {
    let received: unknown = null
    mockServer.use(
      http.post(`${apiBaseUrl}/api/v1/auth/email/login`, async ({ request }) => {
        received = await request.json()
        return createSuccessResponse({ user_id: 'user-1' })
      }),
    )
    await expect(passwordLogin({ email: 'a@b.com', password: 'secret-123' })).resolves.toEqual({
      user_id: 'user-1',
    })
    expect(received).toEqual({ email: 'a@b.com', password: 'secret-123', login_from: 'web' })
  })

  it('调用方显式给出的 login_from 优先', async () => {
    const captured = await captureRequest('/api/v1/auth/email/login')
    await passwordLogin({ email: 'a@b.com', password: 'secret-123', login_from: 'web' })
    expect(captured.body).toEqual({ email: 'a@b.com', password: 'secret-123', login_from: 'web' })
  })
})

describe('邮箱注册与验证', () => {
  it('registerEmail POST /auth/email/register（204）', async () => {
    const captured = await captureRequest('/api/v1/auth/email/register')
    await expect(registerEmail({ email: 'a@b.com', password: 'secret-123' })).resolves.toBeNull()
    expect(captured.method).toBe('POST')
    expect(captured.body).toEqual({ email: 'a@b.com', password: 'secret-123' })
  })

  it('verifyEmailToken POST /auth/email/verify，带 token 与 login_from', async () => {
    let received: unknown = null
    mockServer.use(
      http.post(`${apiBaseUrl}/api/v1/auth/email/verify`, async ({ request }) => {
        received = await request.json()
        return createSuccessResponse({ user_id: 'user-1' })
      }),
    )
    await expect(verifyEmailToken({ token: 'tok-1' })).resolves.toEqual({ user_id: 'user-1' })
    expect(received).toEqual({ token: 'tok-1', login_from: 'web' })
  })

  it('verifyEmailCode POST /auth/email/verify/code', async () => {
    let received: unknown = null
    mockServer.use(
      http.post(`${apiBaseUrl}/api/v1/auth/email/verify/code`, async ({ request }) => {
        received = await request.json()
        return createSuccessResponse({ user_id: 'user-1' })
      }),
    )
    await expect(verifyEmailCode({ email: 'a@b.com', code: '123456' })).resolves.toEqual({
      user_id: 'user-1',
    })
    expect(received).toEqual({ email: 'a@b.com', code: '123456', login_from: 'web' })
  })

  it('resendVerificationEmail POST /auth/email/resend（204）', async () => {
    const captured = await captureRequest('/api/v1/auth/email/resend')
    await expect(resendVerificationEmail({ email: 'a@b.com' })).resolves.toBeNull()
    expect(captured.body).toEqual({ email: 'a@b.com' })
  })
})

describe('口令设置', () => {
  it('无口令时只发 new_password，并解析 200 + relogin_required', async () => {
    let received: unknown = null
    mockServer.use(
      http.put(`${apiBaseUrl}/api/v1/auth/password`, async ({ request }) => {
        received = await request.json()
        return createSuccessResponse({ relogin_required: true })
      }),
    )

    await expect(setPassword({ new_password: 'secret-123' })).resolves.toEqual({
      relogin_required: true,
    })
    expect(received).toEqual({ new_password: 'secret-123' })
  })

  it('已有口令时带 old_password', async () => {
    const captured = await captureRequest('/api/v1/auth/password')
    await setPassword({ old_password: 'old-12345', new_password: 'secret-123' })
    expect(captured.method).toBe('PUT')
    expect(captured.body).toEqual({ old_password: 'old-12345', new_password: 'secret-123' })
  })
})

describe('startIdentityBind', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('POST /auth/identities/bind：provider 与 return_to 都在 JSON body 里', async () => {
    vi.stubGlobal('window', { location: { origin: 'http://127.0.0.1:5173' } })
    let received: unknown = null
    mockServer.use(
      http.post(`${apiBaseUrl}${AUTH_BIND_IDENTITY_PATH}`, async ({ request }) => {
        received = await request.json()
        return createSuccessResponse({
          authorize_url: 'https://github.com/login/oauth/authorize?state=s',
        })
      }),
    )

    await expect(startIdentityBind('github', '/notebook/n-1')).resolves.toEqual({
      authorize_url: 'https://github.com/login/oauth/authorize?state=s',
    })
    expect(received).toEqual({
      provider: 'github',
      return_to: 'http://127.0.0.1:5173/notebook/n-1',
    })
  })

  it('不传 return_to 时 body 里没有该字段（后端 omitempty）', async () => {
    let received: unknown = null
    mockServer.use(
      http.post(`${apiBaseUrl}${AUTH_BIND_IDENTITY_PATH}`, async ({ request }) => {
        received = await request.json()
        return createSuccessResponse({ authorize_url: 'https://accounts.google.com/o/oauth2/v2/auth' })
      }),
    )

    await startIdentityBind('google')
    expect(received).toEqual({ provider: 'google' })
  })

  it('发起绑定前记住当前位置（回调失败时靠它回到原处）', async () => {
    const store = new Map<string, string>()
    vi.stubGlobal('window', {
      location: { origin: 'http://127.0.0.1:5173' },
      sessionStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
      },
    })
    mockServer.use(
      http.post(`${apiBaseUrl}${AUTH_BIND_IDENTITY_PATH}`, () =>
        createSuccessResponse({ authorize_url: 'https://github.com/login/oauth/authorize' }),
      ),
    )

    await startIdentityBind('github', '/notebook/n-1?settings=security')

    expect(recallAuthReturn()).toBe('/notebook/n-1?settings=security')
  })

  it('缺 authorize_url 时报错，不静默跳一个空地址', async () => {
    mockServer.use(
      http.post(`${apiBaseUrl}${AUTH_BIND_IDENTITY_PATH}`, () => createSuccessResponse({})),
    )

    await expect(startIdentityBind('github')).rejects.toBeInstanceOf(ApiError)
  })
})
