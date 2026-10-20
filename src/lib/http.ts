import type { ApiResult } from '../types/api'
import { CSRF_CODE, isNotLoginError, redirectToLogin } from './auth'
import { reportApiError } from './apiErrorToast'
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

export const isRequestAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError'

/**
 * 统一的上抛路径：登录失效先跳转，其余错误交给全局 toast。
 * 返回 `never`，方便在 if/else 里直接 `throw`。
 */
export function throwApiError(error: ApiError): never {
  if (isNotLoginError(error)) {
    redirectToLogin()
  }
  reportApiError(error)
  throw error
}

const toNetworkError = (error: unknown): never => {
  if (isRequestAbortError(error)) {
    throw error
  }
  return throwApiError(new ApiError('Network request failed', -1, 0))
}

export async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase()
  const unsafe = !isSafeMethod(method)

  const sendOnce = async (): Promise<Response> => {
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

  const send = async (): Promise<Response> => {
    try {
      return await sendOnce()
    } catch (error) {
      return toNetworkError(error)
    }
  }

  let response = await send()
  let body = await parseBody<T>(response)

  if (unsafe && response.status === 403 && body?.code === CSRF_CODE) {
    try {
      await refreshCsrfToken()
    } catch (error) {
      toNetworkError(error)
    }
    response = await send()
    body = await parseBody<T>(response)
  }

  if (!response.ok) {
    throwApiError(
      new ApiError(
        body?.msg ?? `HTTP request failed: ${response.status}`,
        body?.code ?? -1,
        response.status,
      ),
    )
  }

  if (response.status === 204) {
    return null as T
  }

  if (!body) {
    throwApiError(new ApiError('Empty response body', -1, response.status))
  }

  if (body.code !== 0) {
    throwApiError(new ApiError(body.msg, body.code, response.status))
  }

  return body.data
}
