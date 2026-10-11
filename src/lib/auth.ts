export const NOT_LOGIN_CODE = 2002
export const CSRF_CODE = 2003
/** 通用未授权（`CodeUnauthorized`）：回调里 state cookie 缺失/不匹配就是它。 */
export const UNAUTHORIZED_CODE = 2000

/**
 * 认证域新增业务错误码。
 *
 * 与后端 `internal/domain/identity/errors/errors.go` 的 `CodeXxx` 常量一一对应
 * （2026-10-11 已核对到 106023）；前端只在这里登记一次，后端再调整时改这一处。
 */
export const AUTH_ERROR_CODE = {
  /** IdP 侧失败（回调 `?error=`，例如用户取消授权）。 */
  idpError: 106002,
  /** 回调的 login state 不存在/已过期（超过 10 分钟、或换了浏览器）。 */
  loginStateNotFound: 106003,
  /** login state 不匹配（CSRF 防护命中）。 */
  loginStateMismatch: 106004,
  /** 用 code 换 token 失败。 */
  idpExchangeError: 106005,
  /** 账号被封禁（`CodeUserBanned`，登录与回调都会返回）。 */
  userBanned: 106008,
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
  /** 该账号已经绑定过同 provider 的另一个身份。 */
  providerAlreadyBound: 106023,
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

export function buildLoginPath(returnTo?: string, notice?: string): string {
  const base = `/login?return_to=${encodeURIComponent(absoluteReturnTo(returnTo))}`
  return notice ? `${base}&notice=${encodeURIComponent(notice)}` : base
}

/** 登录页的说明性提示（`?notice=`）；当前只有一个来源：改口令后全部会话被作废。 */
export const RELOGIN_NOTICE_PASSWORD_CHANGED = 'password_changed'

/**
 * 跳 IdP 之前记住「我在哪、这次做什么」，供回调失败时回到原处并选对文案。
 *
 * 为什么需要它：回调失败的落地页是后端 302 过来的**全新顶层导航**，前端内存状态全没了；
 * 而后端在「state cookie 不匹配 / login state 已过期」这类最常见的失败下**既读不到
 * return_to、也分不清刚才那次是登录还是绑定**（login state 都没了）。
 * sessionStorage 同源跨导航仍在，正好补这个空档。
 *
 * 只是 UX 提示，不是安全边界：读回来照样过 `sanitizeReturnTo`。
 */
const PENDING_AUTH_ATTEMPT_KEY = 'gnlm:pending-auth-attempt'

/** 这次跳 IdP 是登录还是绑定。 */
export type AuthAttemptMode = 'login' | 'bind'

export interface AuthAttempt {
  /** 站内相对路径（已 sanitize）。 */
  returnTo: string
  mode: AuthAttemptMode
}

/** 跳 IdP 前记录当前位置与流程类型。 */
export function rememberAuthAttempt(returnTo: string, mode: AuthAttemptMode): void {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.sessionStorage?.setItem(
      PENDING_AUTH_ATTEMPT_KEY,
      JSON.stringify({ returnTo: absoluteReturnTo(returnTo), mode }),
    )
  } catch {
    // 隐私模式/配额限制：记不住就退回站点根，不影响主流程。
  }
}

/** 取回上次记录的位置与流程类型；没有、损坏或非法时返回 null。 */
export function recallAuthAttempt(): AuthAttempt | null {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    const raw = window.sessionStorage?.getItem(PENDING_AUTH_ATTEMPT_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as { returnTo?: unknown; mode?: unknown }
    return {
      returnTo: sanitizeReturnTo(typeof parsed.returnTo === 'string' ? parsed.returnTo : null),
      mode: parsed.mode === 'bind' ? 'bind' : 'login',
    }
  } catch {
    return null
  }
}

/**
 * 改口令/设口令成功后回登录页。
 *
 * 后端保存口令会作废该账号全部会话（含当前这一个），所以这不是「跳转」而是
 * 「重新登录」：带上提示，用户才不会以为自己莫名其妙被登出。
 */
export function buildReloginPath(returnTo?: string): string {
  return buildLoginPath(returnTo, RELOGIN_NOTICE_PASSWORD_CHANGED)
}

/** 注册页与登录页共用 return_to 语义（注册成功验证后回到原路径）。 */
export function buildSignupPath(returnTo?: string): string {
  return `/signup?return_to=${encodeURIComponent(absoluteReturnTo(returnTo))}`
}

/**
 * 第三方回调失败的落地页（公开路由，不需要会话）。
 *
 * 回调是浏览器的**顶层导航**：后端如果直接返回 `401 + {"code":…}`，浏览器只会把
 * JSON 原文当页面显示，前端完全没有介入的机会。所以后端把失败也变成 302：
 *
 *   登录失败 → GET /login?reason=<kebab>&provider=<github|google|…>
 *   绑定失败 → GET /auth/error?reason=<kebab>&provider=…
 *
 * 只带 reason 不带后端 msg：文案由前端按 reason 决定，不把内部信息铺到页面上。
 * 两个落地页的分工由**路径**决定，不再靠参数猜。
 */
export const AUTH_ERROR_PATH = '/auth/error'

/**
 * 回调失败的 reason 取值，与后端 interfaces 层的映射一一对应：
 * `domainerr` 里的错误转成 kebab-case，认不出来的一律 `internal-error`。
 *
 * 前端只在这里登记一次；后端加/改映射时改这一处，测试会先红。
 */
export const CALLBACK_REASON = {
  /** 路由里的 provider 不在支持列表。 */
  providerNotFound: 'provider-not-found',
  /** IdP 侧失败（回调 `?error=`，含用户取消授权）。 */
  idpError: 'idp-error',
  /** IdP 明确回了 access_denied（用户点了取消）。 */
  idpAccessDenied: 'idp-access-denied',
  /** login state 不存在/已过期（超过 10 分钟、换了浏览器）。 */
  loginStateNotFound: 'login-state-not-found',
  /** login state 不匹配（含 state cookie 缺失/不匹配，CSRF 防护命中）。 */
  loginStateMismatch: 'login-state-mismatch',
  /** 用 code 换 token 失败。 */
  idpExchangeError: 'idp-exchange-error',
  userNotFound: 'user-not-found',
  userSessionNotFound: 'user-session-not-found',
  /** 账号被封禁。 */
  userBanned: 'user-banned',
  /** provider 没有返回已验证邮箱。 */
  idpEmailUnavailable: 'idp-email-unavailable',
  /** 该三方身份已绑定其它账号。 */
  identityAlreadyLinked: 'identity-already-linked',
  /** 绑定要求账号邮箱已验证。 */
  emailNotVerified: 'email-not-verified',
  identityNotFound: 'identity-not-found',
  /** 该账号已绑定过同 provider 的另一个身份。 */
  providerAlreadyBound: 'provider-already-bound',
  /** 认不出来的错误。 */
  internal: 'internal-error',
} as const

export type CallbackReason = (typeof CALLBACK_REASON)[keyof typeof CALLBACK_REASON]

/** 回调失败落地页的两个 query 参数名（后端拼、前端读）。 */
export const CALLBACK_REASON_PARAM = 'reason'
export const CALLBACK_PROVIDER_PARAM = 'provider'

export interface CallbackFailure {
  /** 原始 reason 串：未知值原样保留，便于排查（文案退回通用）。 */
  reason: string
  provider: string
}

/** 解析回调落地页的 `?reason=&provider=`；没有 reason 就说明不是回调失败落地。 */
export function parseCallbackFailure(search: string): CallbackFailure | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const reason = params.get(CALLBACK_REASON_PARAM)?.trim()
  if (!reason) {
    return null
  }
  return { reason, provider: params.get(CALLBACK_PROVIDER_PARAM)?.trim() ?? '' }
}

/** 把失败原因附加到落地地址上（错误页「返回设置」时带上，原因就地显示在对话框里）。 */
export function appendCallbackFailure(path: string, failure: CallbackFailure): string {
  const query = new URLSearchParams({ [CALLBACK_REASON_PARAM]: failure.reason })
  if (failure.provider) {
    query.set(CALLBACK_PROVIDER_PARAM, failure.provider)
  }
  return `${path}${path.includes('?') ? '&' : '?'}${query.toString()}`
}

/** 绑定失败落地页地址；登录页发现「这次其实是绑定」时用它转场。 */
export function buildBindErrorPath(reason: string, provider: string): string {
  const query = new URLSearchParams({ reason })
  if (provider) {
    query.set('provider', provider)
  }
  return `${AUTH_ERROR_PATH}?${query.toString()}`
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

/**
 * 这些页面自己处理「未登录」，不能因为一次 2002 就把用户弹走：
 * - `/login` 本身就是登录入口；
 * - `/signup`、`/verify-email` 在未登录态下才是正常入口，而且它们都会主动探一次
 *   `/user/me` 来判断「已登录就短路回 return_to」——若把这次 2002 当成会话失效，
 *   用户点「创建账号」会被立刻弹回登录页（真实 bug）。
 */
const AUTH_PAGES_HANDLING_NOT_LOGIN = ['/login', '/signup', '/verify-email']

export function redirectToLogin(): void {
  if (redirecting || typeof window === 'undefined') {
    return
  }
  const { pathname, search } = window.location
  if (AUTH_PAGES_HANDLING_NOT_LOGIN.includes(pathname)) {
    return
  }
  redirecting = true
  window.location.assign(buildLoginPath(`${pathname}${search}`))
}

export function resetAuthRedirectForTest(): void {
  redirecting = false
}
