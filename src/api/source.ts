import { ApiError, request } from '../lib/http'
import type {
  ApiResult,
  CreateSourceRequest,
  CreateSourceResponse,
  GetSourceDocResponse,
  GetSourceParsedContentResponse,
  PollSourceStatusResponse,
  UploadFileSourceRequest,
  UploadFileSourceResponse,
} from '../types/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
export const sourceDocCacheTtlMs = 5 * 60 * 1000
export const sourceDocQueryKey = (sourceId: string, docId: string) =>
  ['source-doc', sourceId, docId] as const

export const buildSourceDocQueryOptions = (sourceId: string, docId: string) => ({
  queryKey: sourceDocQueryKey(sourceId, docId),
  queryFn: () =>
    request<GetSourceDocResponse>(
      `/api/v1/source/${encodeURIComponent(sourceId)}/doc/${encodeURIComponent(docId)}`,
      {
        method: 'GET',
      },
    ),
  staleTime: sourceDocCacheTtlMs,
  gcTime: sourceDocCacheTtlMs,
})

export function createSource(payload: CreateSourceRequest) {
  return request<CreateSourceResponse>('/api/v1/source', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function uploadFileSource(sourceId: string, payload: UploadFileSourceRequest) {
  return request<UploadFileSourceResponse>(`/api/v1/source/${sourceId}/file/upload`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function pollSourceStatus(sourceId: string) {
  return request<PollSourceStatusResponse>(`/api/v1/source/${sourceId}/status`, {
    method: 'POST',
  })
}

export function retrySourcePreparation(sourceId: string) {
  return request<null>(`/api/v1/source/${sourceId}/reload`, {
    method: 'POST',
  })
}

export function deleteSource(sourceId: string) {
  return request<null>(`/api/v1/source/${sourceId}`, {
    method: 'DELETE',
  })
}

export async function getSourceParsedContent(sourceId: string) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/source/${encodeURIComponent(sourceId)}/parsed/content`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    },
  )

  if (response.status === 204) {
    return null
  }

  let body: ApiResult<GetSourceParsedContentResponse> | null = null
  try {
    body = (await response.json()) as ApiResult<GetSourceParsedContentResponse>
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

export async function loadParsedContentFromUrl(url: string) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new ApiError(`解析内容读取失败，HTTP ${response.status}`, -1, response.status)
  }

  return response.text()
}

export async function uploadToObjectStorage(
  file: File,
  uploadConfig: UploadFileSourceResponse,
) {
  const form = new FormData()
  Object.entries(uploadConfig.forms ?? {}).forEach(([key, value]) => {
    form.append(key, value)
  })
  form.append('file', file)

  const response = await fetch(uploadConfig.url, {
    method: uploadConfig.method || 'POST',
    body: form,
    headers: uploadConfig.headers,
  })

  if (!response.ok) {
    throw new Error(`object storage upload failed with status ${response.status}`)
  }
}
