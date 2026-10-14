import { request, ApiError } from '../lib/http'
import { absoluteReturnTo, rememberAuthAttempt } from '../lib/auth'
import { attachCsrfHeader, ensureCsrfToken } from '../lib/csrf'
import type {
  AuthIdentitiesResponse,
  AuthPrefetchResponse,
  AuthProvidersResponse,
  AuthSessionResponse,
  AuthSupportedIdentitiesResponse,
  BindIdentityRequest,
  EmailRegisterRequest,
  EmailRegisterResponse,
  EmailResendRequest,
  EmailVerifyCodeRequest,
  PasswordLoginRequest,
  PasswordResetConfirmLinkRequest,
  PasswordResetConfirmResponse,
  PasswordResetRequest,
  SetPasswordRequest,
  SetPasswordResponse,
  UnbindIdentityRequest,
} from '../types/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

/**
 * GET /api/v1/auth/login
 * 校验通过后返回 302，Location 指向 IdP 授权地址。
 */
export const AUTH_LOGIN_PATH = '/api/v1/auth/login'

/**
 * POST 邮箱密码登录。与上面的 GET 不同路径：密码登录归属 `email/*` 分组，
 * 不要因为名字相近而误用 `AUTH_LOGIN_PATH`。
 */
export const AUTH_EMAIL_LOGIN_PATH = '/api/v1/auth/email/login'

export interface AuthLoginParams {
  provider: string
  from: string
  returnTo?: string
}

/** login_provider / login_from / return_to 全部走 query（后端 schema 用的是 query tag）。 */
export function buildAuthLoginPath(params: AuthLoginParams): string {
  const query = new URLSearchParams({
    login_provider: params.provider,
    login_from: params.from,
  })
  if (params.returnTo) {
    query.set('return_to', params.returnTo)
  }
  return `${AUTH_LOGIN_PATH}?${query.toString()}`
}

/** return_to 必须带上前端 origin：只给 `/` 时后端回调会 302 到 API 域名（见 lib/auth.absoluteReturnTo）。 */
export function buildAuthLoginUrl(params: AuthLoginParams): string {
  return `${API_BASE_URL}${buildAuthLoginPath({
    ...params,
    returnTo: absoluteReturnTo(params.returnTo),
  })}`
}

/**
 * 整页导航到登录接口，由浏览器执行后端返回的 302。
 *
 * 这里必须用导航（location），不能用 fetch：fetch 永远不会改变地址栏，
 * 跨域 302 也只会得到 opaqueredirect（status 0、读不到 Location）。
 */
export function goToAuthLogin(params: AuthLoginParams): void {
  // 回调失败时落地页是全新导航，内存状态全丢；先记下「在哪、做什么」以便回得来。
  rememberAuthAttempt(params.returnTo ?? '/', 'login')
  window.location.assign(buildAuthLoginUrl(params))
}

export function getAuthProviders() {
  return request<AuthProvidersResponse>('/api/v1/auth/providers')
}

export function logout() {
  return request<null>('/api/v1/auth/logout', { method: 'POST' })
}

/**
 * 邮箱密码登录。
 *
 * 路径是 `POST /api/v1/auth/email/login`：后端在 2026-10-11 14:45 把密码登录从
 * 「与 `GET /auth/login` 同路径不同方法」改到了 `email/*` 分组下（设计稿 §12 原写
 * `POST /auth/login`，按 §12 的分组原则 `email/*` 更自洽）。GET `/auth/login` 仍是三方登录发起。
 *
 * 成功即签发会话（Set-Cookie）并返回账号标识，调用方通常只需 invalidate `me` 查询。
 */
export function passwordLogin(body: PasswordLoginRequest) {
  return request<AuthSessionResponse>(AUTH_EMAIL_LOGIN_PATH, {
    method: 'POST',
    body: JSON.stringify({ login_from: 'web', ...body }),
  })
}

/**
 * 表单元数据（服务端密码策略等）：公开接口，注册页、设置/修改密码、找回密码共用。
 *
 * 后端 2026-10-14 把原来的 `GET /auth/email/register/prefetch` 与
 * `GET /auth/password/reset/prefetch` 合并成这一个路径，响应体不变（Go 侧
 * `AuthPrefetchResponse`）。全站只有一份策略、一个查询键，各入口进页面时共用同一份缓存。
 */
export const AUTH_PREFETCH_PATH = '/api/v1/auth/prefetch'

/** 密码策略的 react-query 查询键。 */
export const AUTH_PREFETCH_QUERY_KEY = ['auth', 'prefetch'] as const

export function getAuthPrefetch() {
  return request<AuthPrefetchResponse>(AUTH_PREFETCH_PATH)
}

/**
 * 邮箱注册。默认只写 pending 并下发验证邮件 + `_gnlm_signup_ticket`，不建账号、不签发会话；
 * 后端关闭邮箱验证时（auth.emailVerificationRequired=false）直接建号并签发会话，
 * 响应里的 `email_verified` 用来区分这两种结果。
 */
export function registerEmail(body: EmailRegisterRequest) {
  return request<EmailRegisterResponse>('/api/v1/auth/email/register', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/** 6 位验证码验证；成功后同样建号并签发会话。 */
export function verifyEmailCode(body: EmailVerifyCodeRequest) {
  return request<AuthSessionResponse>('/api/v1/auth/email/verify/code', {
    method: 'POST',
    body: JSON.stringify({ login_from: 'web', ...body }),
  })
}

/** 重发验证邮件：只轮换两条验证凭证。 */
export function resendVerificationEmail(body: EmailResendRequest) {
  return request<null>('/api/v1/auth/email/resend', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/**
 * 设置/修改密码（authed + CSRF）。已有密码时必须带 `old_password`。
 *
 * 返回 200 `{relogin_required}`：后端会作废该账号全部会话（含当前）并清 cookie，
 * 调用方必须按 `relogin_required` 把用户送回登录页，不能假设会话还在。
 */
export function setPassword(body: SetPasswordRequest) {
  return request<SetPasswordResponse>('/api/v1/auth/password', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

/**
 * 发起找回密码：`POST /api/v1/auth/password/reset`（公开 + CSRF）。
 *
 * body 只有 email，成功是 **204**；邮箱不存在时后端也返回 204（防账号枚举），
 * 所以调用方拿到 resolve 只能说明「请求受理了」，不能说明邮件已发出。
 */
export function requestPasswordReset(body: PasswordResetRequest) {
  return request<null>('/api/v1/auth/password/reset', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/**
 * 邮件链接确认：`POST /api/v1/auth/password/reset/verify`。
 *
 * token 由前端从 `#token=` 片段读出后提交（与 `/auth/email/verify` 同一套约定），
 * 成功后返回 `relogin_required: true`：后端作废了该账号全部会话。
 */
export function confirmPasswordResetLink(body: PasswordResetConfirmLinkRequest) {
  return request<PasswordResetConfirmResponse>('/api/v1/auth/password/reset/verify', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}


/**
 * GET /api/v1/auth/identities —— 当前账号已绑定的三方身份（authed）。
 * 用于「第三方账号」状态展示；绑定/解绑本身见 `startIdentityBind`。
 */
export function getAuthIdentities() {
  return request<AuthIdentitiesResponse>('/api/v1/auth/identities')
}

/** GET /api/v1/auth/supported-identities —— 代码支持绑定的 provider（authed）。 */
export function getAuthSupportedIdentities() {
  return request<AuthSupportedIdentitiesResponse>('/api/v1/auth/supported-identities')
}

/**
 * 发起绑定第三方身份的地址（authed + CSRF）。
 *
 * provider 走 JSON body（后端 `BindProviderRequest{provider, return_to?}`），
 * 不再编进路径；路径里只有一个固定的 `/identities/bind`。
 */
export const AUTH_BIND_IDENTITY_PATH = '/api/v1/auth/identities/bind'

/** 后端以 302 跳 IdP 时抛出的信号（当前实现返回 200；这条是防回退的兜底）。 */
export class IdentityBindRedirectError extends Error {
  constructor() {
    super('identity bind answered with a redirect the browser cannot follow')
    this.name = 'IdentityBindRedirectError'
  }
}

export interface BindIdentityResult {
  /** IdP 授权地址；`already_bound` 为真时为空串，前端不该跳转。 */
  authorize_url: string
  /**
   * 该 provider 已经绑在当前账号上（后端直接短路，没有走 OAuth）。
   * 此时只需刷新身份列表，让状态立刻变「已绑定」，不要跳 IdP。
   */
  already_bound: boolean
}

/** 解绑三方身份（authed + CSRF）。成功是 204；`bind_id` 必须属于当前账号。 */
export function unbindIdentity(body: UnbindIdentityRequest) {
  return request<null>('/api/v1/auth/identities/unbind', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/**
 * 发起绑定：`POST /auth/identities/bind`（authed + CSRF），body `{provider, return_to?}`。
 *
 * 后端返回 `200 {authorize_url, already_bound}`（不再 302）：正常拿到地址后整页跳 IdP；
 * `already_bound` 为真表示该 provider 已绑在当前账号上，后端没走 OAuth，前端只刷新列表。
 * 为什么不能靠 302：
 * - 浏览器表单 POST 无法携带 `X-CSRF-Token`（后端是纯 header 双提交）→ 403；
 * - fetch 能带 CSRF 头，但 `redirect: 'manual'` 会把 302 折叠成 `opaqueredirect`
 *   （status 0、headers 为空），`Location` 在浏览器里拿不到。
 *
 * @throws IdentityBindRedirectError 万一后端又改回 302（浏览器读不到跳转目标，无法继续）
 */
export async function startIdentityBind(
  provider: string,
  returnTo?: string,
): Promise<BindIdentityResult> {
  const method = 'POST'
  await ensureCsrfToken()

  const payload: BindIdentityRequest = { provider }
  if (returnTo) {
    payload.return_to = absoluteReturnTo(returnTo)
  }
  // 同上：绑定失败（state 过期/换浏览器）时后端既拿不到 return_to，也分不清是不是绑定，
  // 靠这里兜底（登录页会据此把用户转到绑定落地页）。
  rememberAuthAttempt(returnTo ?? '/', 'bind')

  const response = await fetch(`${API_BASE_URL}${AUTH_BIND_IDENTITY_PATH}`, {
    method,
    credentials: 'include',
    // 不跟随跳转：跟随也只会拿到跨源的不透明响应，地址栏不会变。
    redirect: 'manual',
    headers: attachCsrfHeader({ 'Content-Type': 'application/json' }, method),
    body: JSON.stringify(payload),
  })

  // 浏览器：opaqueredirect(status 0)；node/测试：原始 302。
  if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302) {
    throw new IdentityBindRedirectError()
  }

  const body = (await response.json().catch(() => null)) as
    | { code?: number; msg?: string; data?: Partial<BindIdentityResult> }
    | null

  const data = body?.data
  // 已经绑过时 authorize_url 是空串（后端短路），不能按「缺地址」报错。
  const usable = data?.already_bound === true || Boolean(data?.authorize_url)
  if (!response.ok || body?.code !== 0 || !data || !usable) {
    throw new ApiError(
      body?.msg ?? `HTTP request failed: ${response.status}`,
      body?.code ?? -1,
      response.status,
    )
  }

  return { authorize_url: data.authorize_url ?? '', already_bound: data.already_bound === true }
}
