export const NOT_LOGIN_CODE = 2002
export const CSRF_CODE = 2003

type CodedError = { code?: unknown }

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
