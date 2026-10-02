import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './http'
import {
  absoluteReturnTo,
  buildLoginPath,
  isCsrfError,
  isNotLoginError,
  resetAuthRedirectForTest,
  redirectToLogin,
  sanitizeReturnTo,
} from './auth'

describe('sanitizeReturnTo', () => {
  it('保留合法站内路径', () => {
    expect(sanitizeReturnTo('/notebook/a?tab=1')).toBe('/notebook/a?tab=1')
  })

  it.each([
    ['//evil.com', '/'],
    ['/\\evil', '/'],
    ['https://evil.com', '/'],
    ['notebook/a', '/'],
    ['/a\\b', '/'],
    ['/a\rb', '/'],
    ['', '/'],
    [null, '/'],
    [undefined, '/'],
    ['/%', '/'],
    ['/a%2', '/'],
    ['/\u0000', '/'],
  ])('非法 %s 回退 /', (raw, expected) => {
    expect(sanitizeReturnTo(raw as string)).toBe(expected)
  })
})

describe('sanitizeReturnTo 绝对 URL（后端白名单形式）', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { location: { origin: 'http://127.0.0.1:5173' } })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('同源绝对 URL 剥成站内路径', () => {
    expect(sanitizeReturnTo('http://127.0.0.1:5173/notebook/n-1?tab=1')).toBe(
      '/notebook/n-1?tab=1',
    )
  })

  it('异源绝对 URL 回退 /', () => {
    expect(sanitizeReturnTo('http://evil.com/notebook/n-1')).toBe('/')
  })

  it('同源但 path 以 // 开头仍回退 /', () => {
    expect(sanitizeReturnTo('http://127.0.0.1:5173//evil.com')).toBe('/')
  })
})

describe('absoluteReturnTo', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('补上当前站点 origin', () => {
    vi.stubGlobal('window', { location: { origin: 'http://127.0.0.1:5173' } })
    expect(absoluteReturnTo('/notebook/n-1')).toBe('http://127.0.0.1:5173/notebook/n-1')
  })

  it('根路径也带 origin', () => {
    vi.stubGlobal('window', { location: { origin: 'http://127.0.0.1:5173' } })
    expect(absoluteReturnTo(undefined)).toBe('http://127.0.0.1:5173/')
  })

  it('已是同源绝对 URL 时幂等', () => {
    vi.stubGlobal('window', { location: { origin: 'http://127.0.0.1:5173' } })
    expect(absoluteReturnTo('http://127.0.0.1:5173/notebook/n-1')).toBe(
      'http://127.0.0.1:5173/notebook/n-1',
    )
  })

  it('无 window 时退回相对路径', () => {
    expect(absoluteReturnTo('/notebook/n-1')).toBe('/notebook/n-1')
  })
})

describe('buildLoginPath', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('编码 return_to 并带上前端 origin', () => {
    vi.stubGlobal('window', { location: { origin: 'http://127.0.0.1:5173' } })
    expect(buildLoginPath('/notebook/a b')).toBe(
      '/login?return_to=http%3A%2F%2F127.0.0.1%3A5173%2Fnotebook%2Fa%20b',
    )
  })

  it('空值落到站点根路径（不是裸 /）', () => {
    vi.stubGlobal('window', { location: { origin: 'http://127.0.0.1:5173' } })
    expect(buildLoginPath()).toBe('/login?return_to=http%3A%2F%2F127.0.0.1%3A5173%2F')
  })

  it('无 window 时退回相对路径', () => {
    expect(buildLoginPath('/notebook/a')).toBe('/login?return_to=%2Fnotebook%2Fa')
  })
})

describe('error guards', () => {
  it('识别 NOT_LOGIN 与 CSRF', () => {
    expect(isNotLoginError(new ApiError('NOT_LOGIN', 2002, 401))).toBe(true)
    expect(isNotLoginError(new ApiError('x', 1000, 200))).toBe(false)
    expect(isCsrfError(new ApiError('CSRF_TOKEN_INVALID', 2003, 403))).toBe(true)
    expect(isCsrfError(new Error('boom'))).toBe(false)
  })
})

describe('redirectToLogin', () => {
  beforeEach(() => {
    resetAuthRedirectForTest()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('跳转到登录页并携带当前路径', () => {
    const assign = vi.fn()
    vi.stubGlobal('window', {
      location: { pathname: '/notebook/n-1', search: '?x=1', assign, origin: 'http://localhost' },
    })

    redirectToLogin()

    expect(assign).toHaveBeenCalledWith(
      '/login?return_to=http%3A%2F%2Flocalhost%2Fnotebook%2Fn-1%3Fx%3D1',
    )
  })

  it('已在登录页时不跳转', () => {
    const assign = vi.fn()
    vi.stubGlobal('window', {
      location: { pathname: '/login', search: '', assign, origin: 'http://localhost' },
    })

    redirectToLogin()

    expect(assign).not.toHaveBeenCalled()
  })

  it('重复调用只跳转一次', () => {
    const assign = vi.fn()
    vi.stubGlobal('window', {
      location: { pathname: '/notebook/n-1', search: '?x=1', assign, origin: 'http://localhost' },
    })

    redirectToLogin()
    redirectToLogin()

    expect(assign).toHaveBeenCalledTimes(1)
  })
})
