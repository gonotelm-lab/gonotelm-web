import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetAuthRedirectForTest } from './auth'
import { apiErrorToastStore, resetApiErrorToastForTest } from './apiErrorToast'
import { request } from './http'

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

describe('request csrf & auth handling', () => {
  beforeEach(() => {
    resetAuthRedirectForTest()
    resetApiErrorToastForTest()
    vi.stubGlobal('document', { cookie: 'gnlm_csrf=tok' })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('非安全方法带上 X-CSRF-Token', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input
      void init
      return jsonResponse(200, { code: 0, msg: 'ok', data: null })
    })
    vi.stubGlobal('fetch', fetchMock)

    await request('/api/v1/notebooks', { method: 'POST', body: '{}' })

    const init = fetchMock.mock.calls[0][1]
    expect((init?.headers as Headers | undefined)?.get('X-CSRF-Token')).toBe('tok')
  })

  it('2003 刷新 token 后重试一次', async () => {
    vi.stubGlobal('document', { cookie: '' })
    let calls = 0
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
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
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
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
    expect(apiErrorToastStore.getSnapshot()).toBeNull()
  })

  it('HTTP 200 里的业务错误码映射成前端文案', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      jsonResponse(200, { code: 100002, msg: 'invalid name', data: null }),
    ))

    await expect(request('/api/v1/notebooks/n-1')).rejects.toMatchObject({
      code: 100002,
      status: 200,
    })
    expect(apiErrorToastStore.getSnapshot()?.messageKey).toBe(
      'apiError.notebookNameInvalid',
    )
  })

  it('没有业务码时按 HTTP 状态映射', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      jsonResponse(500, { code: 0, msg: 'DATABASE_ERROR', data: null }),
    ))

    await expect(request('/api/v1/notebooks')).rejects.toMatchObject({
      status: 500,
    })
    expect(apiErrorToastStore.getSnapshot()?.messageKey).toBe('apiError.server')
  })

  it('笔记本不存在不弹 toast，交给专用页面', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      jsonResponse(404, { code: 100001, msg: 'notebook not found', data: null }),
    ))

    await expect(request('/api/v1/notebooks/n-1')).rejects.toMatchObject({
      code: 100001,
    })
    expect(apiErrorToastStore.getSnapshot()).toBeNull()
  })

  it('网络异常转成 ApiError 并提示网络失败', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    }))

    await expect(request('/api/v1/notebooks')).rejects.toMatchObject({
      code: -1,
      status: 0,
    })
    expect(apiErrorToastStore.getSnapshot()?.messageKey).toBe('apiError.network')
  })

  it('主动取消请求不提示', async () => {
    const abortError = new Error('aborted')
    abortError.name = 'AbortError'
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw abortError
    }))

    await expect(request('/api/v1/notebooks')).rejects.toBe(abortError)
    expect(apiErrorToastStore.getSnapshot()).toBeNull()
  })
})
