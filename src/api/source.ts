import { request } from '../lib/http'
import type {
  CreateSourceRequest,
  CreateSourceResponse,
  GetSourceDocResponse,
  PollSourceStatusResponse,
  UploadFileSourceRequest,
  UploadFileSourceResponse,
} from '../types/api'

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
