import { request, ApiError } from '../lib/http'
import { absoluteReturnTo } from '../lib/auth'
import { attachCsrfHeader, ensureCsrfToken } from '../lib/csrf'
import type {
  AuthIdentitiesResponse,
  AuthProvidersResponse,
  AuthSessionResponse,
  AuthSupportedIdentitiesResponse,
  EmailRegisterRequest,
  EmailResendRequest,
  EmailVerifyCodeRequest,
  EmailVerifyRequest,
  PasswordLoginRequest,
  SetPasswordRequest,
} from '../types/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

/**
 * GET /api/v1/auth/login
 * 校验通过后返回 302，Location 指向 IdP 授权地址。
 */
export const AUTH_LOGIN_PATH = '/api/v1/auth/login'

/**
 * POST 邮箱口令登录。与上面的 GET 不同路径：口令登录归属 `email/*` 分组，
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
  window.location.assign(buildAuthLoginUrl(params))
}

export function getAuthProviders() {
  return request<AuthProvidersResponse>('/api/v1/auth/providers')
}

export function logout() {
  return request<null>('/api/v1/auth/logout', { method: 'POST' })
}

/**
 * 邮箱口令登录。
 *
 * 路径是 `POST /api/v1/auth/email/login`：后端在 2026-10-11 14:45 把口令登录从
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
 * 邮箱注册：只写 pending 并下发验证邮件 + `_gnlm_signup_ticket`，
 * 不建账号、不签发会话；真正的建号发生在验证成功那一刻。
 */
export function registerEmail(body: EmailRegisterRequest) {
  return request<null>('/api/v1/auth/email/register', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/** 消费邮件链接里的 token（前端从 `location.hash` 读出后 POST 过来）；成功即建号并签发会话。 */
export function verifyEmailToken(body: EmailVerifyRequest) {
  return request<AuthSessionResponse>('/api/v1/auth/email/verify', {
    method: 'POST',
    body: JSON.stringify({ login_from: 'web', ...body }),
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

/** 设置/修改口令（authed + CSRF）。已有口令时必须带 `old_password`。 */
export function setPassword(body: SetPasswordRequest) {
  return request<null>('/api/v1/auth/password', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

/**
 * GET /api/v1/auth/identities —— 当前账号已绑定的三方身份（authed）。
 * 用于「第三方账号」状态展示；绑定/解绑本身见 `buildBindIdentityPath`。
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
 * 触发方式见 `startIdentityBind`：SPA 只能走 fetch（表单 POST 带不了 CSRF 头），
 * 因此需要后端把授权地址放进响应体而不是 302。
 */
export function buildBindIdentityPath(provider: string): string {
  return `/api/v1/auth/identities/${encodeURIComponent(provider)}/bind`
}

/** 后端仍以 302 跳 IdP 时抛出的信号：浏览器读不到 Location，前端无法继续。 */
export class IdentityBindRedirectError extends Error {
  constructor() {
    super('identity bind answered with a redirect the browser cannot follow')
    this.name = 'IdentityBindRedirectError'
  }
}

export interface BindIdentityResult {
  /** IdP 授权地址；由前端整页跳转过去。 */
  authorize_url: string
}

/**
 * 发起绑定：`POST /auth/identities/:provider/bind`（authed + CSRF）。
 *
 * 为什么必须由后端返回授权地址而不是 302：
 * - 浏览器表单 POST 无法携带 `X-CSRF-Token`（后端是纯 header 双提交）→ 403；
 * - fetch 能带 CSRF 头，但 `redirect: 'manual'` 会把 302 折叠成 `opaqueredirect`
 *   （status 0、headers 为空），`Location` 在浏览器里拿不到。
 * 所以后端返回 `200 {authorize_url}` 后，这里整页 `window.location.assign` 即可。
 *
 * @throws IdentityBindRedirectError 后端仍是 302（当前实现），前端无法继续
 */
export async function startIdentityBind(
  provider: string,
  returnTo?: string,
): Promise<BindIdentityResult> {
  const method = 'POST'
  await ensureCsrfToken()

  const response = await fetch(`${API_BASE_URL}${buildBindIdentityPath(provider)}`, {
    method,
    credentials: 'include',
    // 不跟随跳转：跟随也只会拿到跨源的不透明响应，地址栏不会变。
    redirect: 'manual',
    headers: attachCsrfHeader({ 'Content-Type': 'application/json' }, method),
    body: JSON.stringify(returnTo ? { return_to: absoluteReturnTo(returnTo) } : {}),
  })

  // 浏览器：opaqueredirect(status 0)；node/测试：原始 302。
  if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302) {
    throw new IdentityBindRedirectError()
  }

  const body = (await response.json().catch(() => null)) as
    | { code?: number; msg?: string; data?: BindIdentityResult }
    | null

  if (!response.ok || body?.code !== 0 || !body.data?.authorize_url) {
    throw new ApiError(
      body?.msg ?? `HTTP request failed: ${response.status}`,
      body?.code ?? -1,
      response.status,
    )
  }

  return body.data
}
