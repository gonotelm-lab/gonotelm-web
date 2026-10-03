import type { ApiResult } from '../types/api'
import { CSRF_CODE, isNotLoginError, redirectToLogin } from './auth'
import { attachCsrfHeader, ensureCsrfToken, isSafeMethod, refreshCsrfToken } from './csrf'

export class ApiError extends Error {
  readonly code: number
  readonly status: number

  constructor(message: string, code: number, status: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

const parseBody = async <T>(response: Response): Promise<ApiResult<T> | null> => {
  try {
    return (await response.json()) as ApiResult<T>
  } catch {
    return null
  }
}

export async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase()
  const unsafe = !isSafeMethod(method)

  const send = async (): Promise<Response> => {
    if (unsafe) {
      await ensureCsrfToken()
    }
    // FormData 必须让浏览器自行生成 multipart boundary，不能预设 Content-Type。
    const isFormData = init?.body instanceof FormData
    return fetch(`${API_BASE_URL}${path}`, {
      ...init,
      method,
      credentials: 'include',
      headers: attachCsrfHeader(
        {
          ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
          ...(init?.headers ?? {}),
        },
        method,
      ),
    })
  }

  let response = await send()
  let body = await parseBody<T>(response)

  if (unsafe && response.status === 403 && body?.code === CSRF_CODE) {
    await refreshCsrfToken()
    response = await send()
    body = await parseBody<T>(response)
  }

  if (!response.ok) {
    const error = new ApiError(
      body?.msg ?? `HTTP request failed: ${response.status}`,
      body?.code ?? -1,
      response.status,
    )
    if (isNotLoginError(error)) {
      redirectToLogin()
    }
    throw error
  }

  if (response.status === 204) {
    return null as T
  }

  if (!body) {
    throw new ApiError('Empty response body', -1, response.status)
  }

  if (body.code !== 0) {
    const error = new ApiError(body.msg, body.code, response.status)
    if (isNotLoginError(error)) {
      redirectToLogin()
    }
    throw error
  }

  return body.data
}
