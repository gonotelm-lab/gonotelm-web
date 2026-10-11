export const NOT_LOGIN_CODE = 2002
export const CSRF_CODE = 2003

/**
 * 认证域新增业务错误码。
 *
 * 与后端 `internal/domain/identity/errors/errors.go` 的 `CodeXxx` 常量一一对应
 * （2026-10-11 已核对到 106022）；前端只在这里登记一次，后端再调整时改这一处。
 */
export const AUTH_ERROR_CODE = {
  /** 账号密码不匹配 / 账号不存在（登录统一文案）。 */
  invalidCredentials: 106011,
  /** 注册邮箱已被占用。 */
  emailTaken: 106012,
  /** 邮箱格式非法。 */
  emailInvalid: 106013,
  /** 口令不满足策略。 */
  weakPassword: 106014,
  /** provider 无可用已验证邮箱。 */
  idpEmailUnavailable: 106015,
  /** 验证凭证过期/不存在/已被消费。 */
  verificationExpired: 106016,
  /** 验证码尝试超限（pending 已作废）。 */
  verificationAttemptsExceeded: 106017,
  /** 验证码不匹配（还有剩余尝试次数）。 */
  verificationCodeMismatch: 106018,
  /** 该三方身份已绑定其它账号。 */
  identityAlreadyLinked: 106019,
  /** 绑定要求账号邮箱已验证。 */
  emailNotVerified: 106020,
  /** 触发限流（P1）。 */
  tooManyRequests: 106021,
  /** 三方身份不存在（身份列表/解绑，P1）。 */
  identityNotFound: 106022,
} as const

export type AuthErrorCode = (typeof AUTH_ERROR_CODE)[keyof typeof AUTH_ERROR_CODE]

type CodedError = { code?: unknown }

/** 取业务错误码；非 ApiError（网络异常等）返回 undefined。 */
export function authErrorCodeOf(error: unknown): number | undefined {
  const code = (error as CodedError | null)?.code
  return typeof code === 'number' ? code : undefined
}

export function isAuthErrorCode(error: unknown, code: number): boolean {
  return authErrorCodeOf(error) === code
}

export function isNotLoginError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error as CodedError).code === NOT_LOGIN_CODE
  )
}

export function isCsrfError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error as CodedError).code === CSRF_CODE
  )
}

/** 反斜杠与控制字符（含 DEL）会破坏 path 语义，一律拒绝。 */
function hasUnsafeChars(raw: string): boolean {
  if (raw.includes('\\')) {
    return true
  }
  for (let index = 0; index < raw.length; index += 1) {
    const code = raw.charCodeAt(index)
    if (code < 0x20 || code === 0x7f) {
      return true
    }
  }
  return false
}

/** 站内相对路径原样通过；`//`、`/\`、反斜杠、控制字符、坏转义一律拒绝。 */
function toSafeRelativePath(raw: string): string | null {
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
    return null
  }
  if (hasUnsafeChars(raw)) {
    return null
  }
  try {
    decodeURIComponent(raw)
  } catch {
    return null
  }
  return raw
}

/** 绝对 URL 只有在与当前站点同源时才取回 path，避免开放重定向。 */
function sameOriginPath(raw: string): string | null {
  if (!/^https?:\/\//i.test(raw)) {
    return null
  }
  const origin = typeof window === 'undefined' ? undefined : window.location?.origin
  if (!origin) {
    return null
  }
  try {
    const url = new URL(raw, origin)
    if (url.origin !== origin) {
      return null
    }
    return toSafeRelativePath(`${url.pathname}${url.search}${url.hash}`)
  } catch {
    return null
  }
}

/**
 * 归一化成站内相对路径（SPA 内 `<Navigate>` 用）。
 *
 * 后端 `IsSafeReturnTo` 同时接受相对路径和 origin 白名单内的绝对 URL，
 * 这里把绝对形式剥成 path，交回 react-router 处理；非法值一律回退 `/`。
 */
export function sanitizeReturnTo(raw: string | null | undefined): string {
  if (!raw) {
    return '/'
  }
  return toSafeRelativePath(raw) ?? sameOriginPath(raw) ?? '/'
}

/**
 * 后端把 return_to 直接当 `Location` 用：只带 `/` 会落到 API 域名而不是前端，
 * 所以出站（`/login` 链接、`/auth/login`）统一补上当前站点的 origin。
 */
export function absoluteReturnTo(raw?: string | null): string {
  const path = sanitizeReturnTo(raw)
  const origin = typeof window === 'undefined' ? undefined : window.location?.origin
  return origin ? `${origin}${path}` : path
}

export function buildLoginPath(returnTo?: string): string {
  return `/login?return_to=${encodeURIComponent(absoluteReturnTo(returnTo))}`
}

/** 注册页与登录页共用 return_to 语义（注册成功验证后回到原路径）。 */
export function buildSignupPath(returnTo?: string): string {
  return `/signup?return_to=${encodeURIComponent(absoluteReturnTo(returnTo))}`
}

/**
 * 邮箱验证页。/signup 成功后跳到 `?email=` 进入「输验证码」模式；
 * 邮件链接则直接带 `#token=` 进入「确认链接」模式。
 */
export function buildVerifyEmailPath(options?: {
  email?: string
  returnTo?: string
  token?: string
}): string {
  const query = new URLSearchParams()
  if (options?.email) {
    query.set('email', options.email)
  }
  if (options?.returnTo !== undefined) {
    query.set('return_to', absoluteReturnTo(options.returnTo))
  }
  const search = query.toString()
  const base = `/verify-email${search ? `?${search}` : ''}`
  // token 只放 URL 片段：不发服务端、不进访问日志、也不进 Referer。
  return options?.token ? `${base}#token=${encodeURIComponent(options.token)}` : base
}

export function buildSetPasswordPath(returnTo?: string): string {
  return `/set-password?return_to=${encodeURIComponent(absoluteReturnTo(returnTo))}`
}

/** 验证 token 允许的形态：非空、无空白与控制字符。 */
function toSafeVerifyToken(raw: string | null | undefined): string {
  const token = (raw ?? '').trim()
  if (!token || /\s/.test(token) || hasUnsafeChars(token)) {
    return ''
  }
  return token
}

/**
 * 从邮件链接的 URL 片段里取验证 token。
 *
 * 后端设计把 token 放在 `#` 之后（`#token=xxx`），同时兼容 `#<token>` 这种裸写法；
 * `?token=` 只作为兜底（query 会进服务端日志，仅在后端确实这样下发时才用到）。
 */
export function extractVerifyToken(hash: string, search?: string): string {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (raw) {
    const named = new URLSearchParams(raw).get('token')
    if (named) {
      return toSafeVerifyToken(named)
    }
    if (!raw.includes('=')) {
      return toSafeVerifyToken(raw)
    }
  }
  if (search) {
    const fromQuery = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get(
      'token',
    )
    if (fromQuery) {
      return toSafeVerifyToken(fromQuery)
    }
  }
  return ''
}

let redirecting = false

export function redirectToLogin(): void {
  if (redirecting || typeof window === 'undefined') {
    return
  }
  const { pathname, search } = window.location
  if (pathname === '/login') {
    return
  }
  redirecting = true
  window.location.assign(buildLoginPath(`${pathname}${search}`))
}

export function resetAuthRedirectForTest(): void {
  redirecting = false
}
