import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  attachCsrfHeader,
  ensureCsrfToken,
  isSafeMethod,
  readCsrfToken,
  refreshCsrfToken,
} from './csrf'

describe('csrf', () => {
  beforeEach(() => {
    vi.stubGlobal('document', { cookie: '' })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('判定安全方法', () => {
    expect(isSafeMethod('GET')).toBe(true)
    expect(isSafeMethod('head')).toBe(true)
    expect(isSafeMethod('POST')).toBe(false)
    expect(isSafeMethod('DELETE')).toBe(false)
  })

  it('读取 gnlm_csrf cookie', () => {
    vi.stubGlobal('document', { cookie: 'a=1; gnlm_csrf=tok%2B1; b=2' })
    expect(readCsrfToken()).toBe('tok+1')
  })

  it('cookie 编码非法时返回空且不抛错', () => {
    vi.stubGlobal('document', { cookie: 'gnlm_csrf=%E0%A4%A' })
    expect(() => readCsrfToken()).not.toThrow()
    expect(readCsrfToken()).toBe('')
  })

  it('非安全方法附加 X-CSRF-Token', () => {
    vi.stubGlobal('document', { cookie: 'gnlm_csrf=tok' })
    const headers = attachCsrfHeader({ 'Content-Type': 'application/json' }, 'POST')
    expect(headers.get('X-CSRF-Token')).toBe('tok')
  })

  it('安全方法不附加', () => {
    vi.stubGlobal('document', { cookie: 'gnlm_csrf=tok' })
    const headers = attachCsrfHeader(undefined, 'GET')
    expect(headers.get('X-CSRF-Token')).toBeNull()
  })

  it('cookie 缺失时通过安全请求 bootstrap 且并发共享', async () => {
    const fetchMock = vi.fn(async () => {
      vi.stubGlobal('document', { cookie: 'gnlm_csrf=fresh' })
      return new Response('{}', { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const [a, b] = await Promise.all([ensureCsrfToken(), ensureCsrfToken()])
    expect(a).toBe('fresh')
    expect(b).toBe('fresh')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('refreshCsrfToken 重新 bootstrap', async () => {
    const fetchMock = vi.fn(async () => {
      vi.stubGlobal('document', { cookie: 'gnlm_csrf=next' })
      return new Response('{}', { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    expect(await refreshCsrfToken()).toBe('next')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('无 document 环境（node 测试）返回空且不请求', async () => {
    vi.stubGlobal('document', undefined)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await ensureCsrfToken()).toBe('')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
