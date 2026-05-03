import type { ApiResult } from '../types/api'

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

export async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  let body: ApiResult<T> | null = null
  try {
    body = (await response.json()) as ApiResult<T>
  } catch {
    // keep body null, handled below
  }

  if (!response.ok) {
    throw new ApiError(
      body?.msg ?? `HTTP request failed: ${response.status}`,
      body?.code ?? -1,
      response.status,
    )
  }

  if (!body) {
    throw new ApiError('Empty response body', -1, response.status)
  }

  if (body.code !== 0) {
    throw new ApiError(body.msg, body.code, response.status)
  }

  return body.data
}
