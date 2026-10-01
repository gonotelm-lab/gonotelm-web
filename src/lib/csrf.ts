export const CSRF_COOKIE_NAME = 'gnlm_csrf'
export const CSRF_HEADER_NAME = 'X-CSRF-Token'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function isSafeMethod(method: string): boolean {
  return SAFE_METHODS.has(method.toUpperCase())
}

export function readCsrfToken(): string {
  if (typeof document === 'undefined' || !document.cookie) {
    return ''
  }
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim()
    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex < 0) {
      continue
    }
    if (trimmed.slice(0, separatorIndex) === CSRF_COOKIE_NAME) {
      return decodeURIComponent(trimmed.slice(separatorIndex + 1))
    }
  }
  return ''
}

async function bootstrapCsrfToken(): Promise<string> {
  if (typeof document === 'undefined') {
    return ''
  }
  await fetch(`${API_BASE_URL}/api/v1/auth/providers`, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  return readCsrfToken()
}

let bootstrapPromise: Promise<string> | null = null

export function ensureCsrfToken(): Promise<string> {
  const token = readCsrfToken()
  if (token || typeof document === 'undefined') {
    return Promise.resolve(token)
  }
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrapCsrfToken().finally(() => {
      bootstrapPromise = null
    })
  }
  return bootstrapPromise
}

export function refreshCsrfToken(): Promise<string> {
  bootstrapPromise = null
  return bootstrapCsrfToken()
}

export function attachCsrfHeader(
  headers: HeadersInit | undefined,
  method: string,
): Headers {
  const next = new Headers(headers)
  if (!isSafeMethod(method)) {
    const token = readCsrfToken()
    if (token) {
      next.set(CSRF_HEADER_NAME, token)
    }
  }
  return next
}
