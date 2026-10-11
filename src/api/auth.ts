import { request } from '../lib/http'
import { absoluteReturnTo } from '../lib/auth'
import type {
  AuthProvidersResponse,
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
 * 邮箱口令登录：与 `GET /auth/login` 同路径、不同方法。
 * 成功即签发会话（Set-Cookie），因此只需 invalidate `me` 查询，无需处理响应体。
 */
export function passwordLogin(body: PasswordLoginRequest) {
  return request<null>('/api/v1/auth/login', {
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

/** 消费邮件链接里的 token（前端从 `location.hash` 读出后 POST 过来）。 */
export function verifyEmailToken(body: EmailVerifyRequest) {
  return request<null>('/api/v1/auth/email/verify', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/** 6 位验证码验证；成功后同样建号并签发会话。 */
export function verifyEmailCode(body: EmailVerifyCodeRequest) {
  return request<null>('/api/v1/auth/email/verify/code', {
    method: 'POST',
    body: JSON.stringify(body),
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
 * 发起绑定第三方身份的地址。
 *
 * 后端返回 302 跳 IdP，因此这里必须由浏览器做整页导航（同 `goToAuthLogin`）；
 * 具体触发方式（表单 POST / 其它）等后端接口落地后再定，见 docs 里的开放问题。
 */
export function buildBindIdentityPath(provider: string): string {
  return `/api/v1/auth/identities/${encodeURIComponent(provider)}/bind`
}
