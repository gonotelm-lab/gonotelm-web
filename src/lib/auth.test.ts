import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './http'
import {
  AUTH_ERROR_CODE,
  RELOGIN_NOTICE_PASSWORD_CHANGED,
  buildBindErrorPath,
  parseCallbackFailure,
  recallAuthAttempt,
  rememberAuthAttempt,
  absoluteReturnTo,
  buildLoginPath,
  buildReloginPath,
  buildSetPasswordPath,
  buildSignupPath,
  buildVerifyEmailPath,
  authErrorCodeOf,
  extractVerifyToken,
  isAuthErrorCode,
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

  it('带 notice 时追加说明参数，不带时保持原样', () => {
    vi.stubGlobal('window', { location: { origin: 'http://127.0.0.1:5173' } })
    expect(buildLoginPath('/notebook/a', RELOGIN_NOTICE_PASSWORD_CHANGED)).toBe(
      '/login?return_to=http%3A%2F%2F127.0.0.1%3A5173%2Fnotebook%2Fa&notice=password_changed',
    )
  })
})

describe('rememberAuthAttempt / recallAuthAttempt', () => {
  const installWindow = (options: { storage?: boolean } = {}) => {
    const store = new Map<string, string>()
    const sessionStorage = options.storage
      ? {
          getItem: (key: string) => store.get(key) ?? null,
          setItem: (key: string, value: string) => void store.set(key, value),
        }
      : undefined
    vi.stubGlobal('window', {
      location: { origin: 'http://127.0.0.1:5173' },
      sessionStorage,
    })
    return store
  }

  afterEach(() => vi.unstubAllGlobals())

  it('记下位置与流程类型，读回来是站内相对路径', () => {
    installWindow({ storage: true })
    rememberAuthAttempt('/notebook/n-1?settings=account', 'bind')

    expect(recallAuthAttempt()).toEqual({
      returnTo: '/notebook/n-1?settings=account',
      mode: 'bind',
    })
  })

  it('登录流程记成 login', () => {
    installWindow({ storage: true })
    rememberAuthAttempt('/', 'login')

    expect(recallAuthAttempt()?.mode).toBe('login')
  })

  it('读回时照样过 sanitize：被塞进站外 URL 也只会落到 /', () => {
    const store = installWindow({ storage: true })
    store.set(
      'gnlm:pending-auth-attempt',
      JSON.stringify({ returnTo: 'https://evil.com/steal', mode: 'bind' }),
    )

    expect(recallAuthAttempt()?.returnTo).toBe('/')
  })

  it('内容损坏时返回 null 而不是抛异常', () => {
    const store = installWindow({ storage: true })
    store.set('gnlm:pending-auth-attempt', '{not json')

    expect(recallAuthAttempt()).toBeNull()
  })

  it('没有 window（SSR/测试）时安静返回 null', () => {
    vi.stubGlobal('window', undefined)
    rememberAuthAttempt('/notebook/n-1', 'bind')

    expect(recallAuthAttempt()).toBeNull()
  })

  it('sessionStorage 不可用（隐私模式）时不抛异常', () => {
    installWindow()
    expect(() => rememberAuthAttempt('/notebook/n-1', 'bind')).not.toThrow()
    expect(recallAuthAttempt()).toBeNull()
  })
})

describe('parseCallbackFailure / buildBindErrorPath', () => {
  it('解析后端 302 过来的 reason 与 provider', () => {
    expect(parseCallbackFailure('?reason=login-state-not-found&provider=github')).toEqual({
      reason: 'login-state-not-found',
      provider: 'github',
    })
  })

  it('没有 reason 就不是回调失败落地（例如普通打开登录页）', () => {
    expect(parseCallbackFailure('?return_to=%2Fnotebook%2Fa')).toBeNull()
    expect(parseCallbackFailure('')).toBeNull()
    expect(parseCallbackFailure('?reason=%20')).toBeNull()
  })

  it('provider 缺失时留空串，不炸', () => {
    expect(parseCallbackFailure('?reason=user-banned')).toEqual({
      reason: 'user-banned',
      provider: '',
    })
  })

  it('未知 reason 原样保留（文案退回通用，排查时能看到原值）', () => {
    expect(parseCallbackFailure('?reason=brand-new-thing')?.reason).toBe('brand-new-thing')
  })

  it('buildBindErrorPath 拼出绑定落地页，provider 可选', () => {
    expect(buildBindErrorPath('provider-already-bound', 'google')).toBe(
      '/auth/error?reason=provider-already-bound&provider=google',
    )
    expect(buildBindErrorPath('internal-error', '')).toBe(
      '/auth/error?reason=internal-error',
    )
  })
})

describe('buildReloginPath', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('改口令后回登录页并带 notice=password_changed', () => {
    vi.stubGlobal('window', { location: { origin: 'http://127.0.0.1:5173' } })
    expect(buildReloginPath('/notebook/a')).toBe(
      '/login?return_to=http%3A%2F%2F127.0.0.1%3A5173%2Fnotebook%2Fa&notice=password_changed',
    )
  })
})

describe('error guards', () => {
  it('识别 NOT_LOGIN 与 CSRF', () => {
    expect(isNotLoginError(new ApiError('NOT_LOGIN', 2002, 401))).toBe(true)
    expect(isNotLoginError(new ApiError('x', 1000, 200))).toBe(false)
    expect(isCsrfError(new ApiError('CSRF_TOKEN_INVALID', 2003, 403))).toBe(true)
    expect(isCsrfError(new Error('boom'))).toBe(false)
  })

  it('识别 users_v2 新增的业务码', () => {
    expect(isAuthErrorCode(new ApiError('bad creds', 106011, 200), AUTH_ERROR_CODE.invalidCredentials)).toBe(true)
    expect(isAuthErrorCode(new ApiError('bad creds', 106011, 200), AUTH_ERROR_CODE.emailTaken)).toBe(false)
    expect(authErrorCodeOf(new ApiError('x', 106016, 200))).toBe(106016)
    expect(authErrorCodeOf(new Error('boom'))).toBeUndefined()
    expect(authErrorCodeOf(null)).toBeUndefined()
  })
})

describe('AUTH_ERROR_CODE 契约', () => {
  it('与后端 internal/domain/identity/errors 的常量逐条一致', () => {
    // 这条断言是前后端错误码的硬契约：后端改了码而前端没跟，测试先红。
    expect(AUTH_ERROR_CODE).toEqual({
      idpError: 106002,
      loginStateNotFound: 106003,
      loginStateMismatch: 106004,
      idpExchangeError: 106005,
      userBanned: 106008,
      invalidCredentials: 106011,
      emailTaken: 106012,
      emailInvalid: 106013,
      weakPassword: 106014,
      idpEmailUnavailable: 106015,
      verificationExpired: 106016,
      verificationAttemptsExceeded: 106017,
      verificationCodeMismatch: 106018,
      identityAlreadyLinked: 106019,
      emailNotVerified: 106020,
      tooManyRequests: 106021,
      identityNotFound: 106022,
      providerAlreadyBound: 106023,
    })
  })
})

describe('邮箱认证页路径', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('buildSignupPath 与 buildLoginPath 同规则编码 return_to', () => {
    vi.stubGlobal('window', { location: { origin: 'http://127.0.0.1:5173' } })
    expect(buildSignupPath('/notebook/a b')).toBe(
      '/signup?return_to=http%3A%2F%2F127.0.0.1%3A5173%2Fnotebook%2Fa%20b',
    )
    expect(buildSetPasswordPath('/notebook/a b')).toBe(
      '/set-password?return_to=http%3A%2F%2F127.0.0.1%3A5173%2Fnotebook%2Fa%20b',
    )
  })

  it('buildVerifyEmailPath 只在有 token 时写 URL 片段', () => {
    vi.stubGlobal('window', { location: { origin: 'http://127.0.0.1:5173' } })
    expect(buildVerifyEmailPath({ email: 'a@b.com', returnTo: '/' })).toBe(
      '/verify-email?email=a%40b.com&return_to=http%3A%2F%2F127.0.0.1%3A5173%2F',
    )
    expect(buildVerifyEmailPath({ returnTo: '/', token: 't 1' })).toContain('#token=t%201')
  })
})

describe('extractVerifyToken', () => {
  it('解析 #token= 形式', () => {
    expect(extractVerifyToken('#token=abc123')).toBe('abc123')
  })

  it('兼容裸 #<token> 形式', () => {
    expect(extractVerifyToken('#abc123')).toBe('abc123')
  })

  it('片段里没有 token 时回退 query', () => {
    expect(extractVerifyToken('', '?token=xyz')).toBe('xyz')
    expect(extractVerifyToken('#', '?token=xyz')).toBe('xyz')
  })

  it('空片段、无 token 与非法字符一律返回空串', () => {
    expect(extractVerifyToken('')).toBe('')
    expect(extractVerifyToken('#other=1')).toBe('')
    expect(extractVerifyToken('#token=abc def')).toBe('')
    expect(extractVerifyToken('#token=')).toBe('')
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

  it.each(['/signup', '/verify-email'])(
    '注册/验证页自己处理未登录，%s 上不跳转（否则会被弹回登录页）',
    (pathname) => {
      const assign = vi.fn()
      vi.stubGlobal('window', {
        location: { pathname, search: '', assign, origin: 'http://localhost' },
      })

      redirectToLogin()

      expect(assign).not.toHaveBeenCalled()
    },
  )

  it('受保护页面仍然会跳登录页', () => {
    const assign = vi.fn()
    vi.stubGlobal('window', {
      location: { pathname: '/set-password', search: '', assign, origin: 'http://localhost' },
    })

    redirectToLogin()

    expect(assign).toHaveBeenCalledWith(
      '/login?return_to=http%3A%2F%2Flocalhost%2Fset-password',
    )
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
