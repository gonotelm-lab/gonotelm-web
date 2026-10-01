import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './http'
import {
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
  ])('非法 %s 回退 /', (raw, expected) => {
    expect(sanitizeReturnTo(raw as string)).toBe(expected)
  })
})

describe('buildLoginPath', () => {
  it('编码 return_to', () => {
    expect(buildLoginPath('/notebook/a b')).toBe('/login?return_to=%2Fnotebook%2Fa%20b')
  })

  it('空值回退根路径', () => {
    expect(buildLoginPath()).toBe('/login?return_to=%2F')
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

    expect(assign).toHaveBeenCalledWith('/login?return_to=%2Fnotebook%2Fn-1%3Fx%3D1')
  })

  it('已在登录页时不跳转', () => {
    const assign = vi.fn()
    vi.stubGlobal('window', {
      location: { pathname: '/login', search: '', assign, origin: 'http://localhost' },
    })

    redirectToLogin()

    expect(assign).not.toHaveBeenCalled()
  })
})
