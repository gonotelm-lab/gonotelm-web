import { ApiError, request } from '../lib/http'
import type {
  CreateSourceRequest,
  CreateSourceResponse,
  GetSourceDocResponse,
  GetSourceResponse,
  GetSourceParsedContentResponse,
  GetSourceParsedTreeResponse,
  PollSourceStatusResponse,
  UploadFileSourceRequest,
  UploadFileSourceResponse,
} from '../types/api'

const sourceDocCacheTtlMs = 5 * 60 * 1000
const sourceDocQueryKey = (sourceId: string, docId: string) =>
  ['source-doc', sourceId, docId] as const
const sourcePreviewCacheTtlMs = 5 * 60 * 1000

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

interface GetSourceParams {
  download?: boolean
}

const buildGetSourcePath = (
  sourceId: string,
  params: GetSourceParams = {},
) => {
  const normalizedSourceId = sourceId.trim().replace(/\/+$/, '')
  const query = new URLSearchParams()
  if (params.download) {
    query.set('download', 'true')
  }

  const suffix = query.toString()
  const encodedSourceId = encodeURIComponent(normalizedSourceId)
  return suffix
    ? `/api/v1/source/${encodedSourceId}?${suffix}`
    : `/api/v1/source/${encodedSourceId}`
}

export function getSource(sourceId: string, params: GetSourceParams = {}) {
  return request<GetSourceResponse>(buildGetSourcePath(sourceId, params), {
    method: 'GET',
  })
}

const sourceParsedContentQueryKey = (sourceId: string) =>
  ['source-parsed-content', sourceId] as const

export const buildSourceParsedContentQueryOptions = (sourceId: string) => ({
  queryKey: sourceParsedContentQueryKey(sourceId),
  queryFn: () => getSourceParsedContent(sourceId),
  staleTime: sourcePreviewCacheTtlMs,
  gcTime: sourcePreviewCacheTtlMs,
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

interface UpdateSourceTitleRequest {
  title: string
}

export function updateSourceTitle(sourceId: string, payload: UpdateSourceTitleRequest) {
  return request<null>(`/api/v1/source/${sourceId}/title`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

interface GetSourceParsedContentParams {
  download?: boolean
}

async function getSourceParsedContent(
  sourceId: string,
  params: GetSourceParsedContentParams = {},
) {
  const source = await getSource(sourceId, params)
  const parsedContentUrl = source.parsed_content?.url?.trim()
  if (!parsedContentUrl) {
    return null
  }
  return {
    url: parsedContentUrl,
  } satisfies GetSourceParsedContentResponse
}

export const getSourceParsedContentForDownload = (sourceId: string) =>
  getSourceParsedContent(sourceId, { download: true })

export function getSourceParsedTree(sourceId: string) {
  return request<GetSourceParsedTreeResponse>(
    `/api/v1/source/${encodeURIComponent(sourceId)}/parsed/tree`,
    {
      method: 'GET',
    },
  )
}

const sourceParsedContentUrlQueryKey = (url: string) =>
  ['source-parsed-content-url', url] as const

async function loadParsedContentFromUrl(url: string) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new ApiError(`解析内容读取失败，HTTP ${response.status}`, -1, response.status)
  }
  return response.text()
}

export const buildSourceParsedContentUrlQueryOptions = (url: string) => ({
  queryKey: sourceParsedContentUrlQueryKey(url),
  queryFn: () => loadParsedContentFromUrl(url),
  staleTime: sourcePreviewCacheTtlMs,
  gcTime: sourcePreviewCacheTtlMs,
})

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
