import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetAuthRedirectForTest } from './auth'
import { request } from './http'

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

describe('request csrf & auth handling', () => {
  beforeEach(() => {
    resetAuthRedirectForTest()
    vi.stubGlobal('document', { cookie: 'gnlm_csrf=tok' })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('非安全方法带上 X-CSRF-Token', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse(200, { code: 0, msg: 'ok', data: null }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await request('/api/v1/notebooks', { method: 'POST', body: '{}' })

    const init = fetchMock.mock.calls[0][1]
    expect((init?.headers as Headers | undefined)?.get('X-CSRF-Token')).toBe('tok')
  })

  it('2003 刷新 token 后重试一次', async () => {
    vi.stubGlobal('document', { cookie: '' })
    let calls = 0
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/v1/auth/providers')) {
        vi.stubGlobal('document', { cookie: 'gnlm_csrf=refreshed' })
        return jsonResponse(200, { code: 0, msg: 'ok', data: { providers: [] } })
      }
      calls += 1
      if (calls === 1) {
        return jsonResponse(403, { code: 2003, msg: 'CSRF_TOKEN_INVALID', data: null })
      }
      return jsonResponse(200, { code: 0, msg: 'ok', data: { id: 'n-1' } })
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await request<{ id: string }>('/api/v1/notebooks', {
      method: 'POST',
      body: '{}',
    })
    expect(result).toEqual({ id: 'n-1' })
    expect(calls).toBe(2)
  })

  it('连续 2003 只刷新重试一次后上抛', async () => {
    vi.stubGlobal('document', { cookie: '' })
    let endpointCalls = 0
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/v1/auth/providers')) {
        vi.stubGlobal('document', { cookie: 'gnlm_csrf=refreshed' })
        return jsonResponse(200, { code: 0, msg: 'ok', data: { providers: [] } })
      }
      endpointCalls += 1
      return jsonResponse(403, { code: 2003, msg: 'CSRF_TOKEN_INVALID', data: null })
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      request('/api/v1/notebooks', { method: 'POST', body: '{}' }),
    ).rejects.toMatchObject({ code: 2003 })
    expect(endpointCalls).toBe(2)
  })

  it('2002 触发登录跳转并上抛', async () => {
    const assign = vi.fn()
    vi.stubGlobal('window', {
      location: { pathname: '/', search: '', assign, origin: 'http://localhost' },
    })
    vi.stubGlobal('fetch', vi.fn(async () =>
      jsonResponse(401, { code: 2002, msg: 'NOT_LOGIN', data: null }),
    ))

    await expect(request('/api/v1/user/me')).rejects.toMatchObject({ code: 2002 })
    expect(assign).toHaveBeenCalledWith('/login?return_to=http%3A%2F%2Flocalhost%2F')
  })
})
