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

export function sanitizeReturnTo(raw: string | null | undefined): string {
  if (!raw) {
    return '/'
  }
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
    return '/'
  }
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) {
    return '/'
  }
  try {
    decodeURIComponent(raw)
  } catch {
    return '/'
  }
  return raw
}

export function buildLoginPath(returnTo?: string): string {
  return `/login?return_to=${encodeURIComponent(sanitizeReturnTo(returnTo))}`
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
