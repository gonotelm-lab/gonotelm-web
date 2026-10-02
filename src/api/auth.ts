import { request } from '../lib/http'
import { absoluteReturnTo } from '../lib/auth'
import type { AuthProvidersResponse } from '../types/api'

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
