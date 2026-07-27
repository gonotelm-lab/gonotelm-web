import { ApiError, request } from '../lib/http'
import type {
  CreateSourceRequest,
  CreateSourceResponse,
  GetSourceDocResponse,
  GetSourceResponse,
  GetSourceParsedContentResponse,
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
  queryFn: () => getSourceDoc(sourceId, docId),
  staleTime: sourceDocCacheTtlMs,
  gcTime: sourceDocCacheTtlMs,
})

export function getSourceDoc(sourceId: string, docId: string) {
  return request<GetSourceDocResponse>(
    `/api/v1/sources/${encodeURIComponent(sourceId)}/docs/${encodeURIComponent(docId)}`,
    {
      method: 'GET',
    },
  )
}

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
    ? `/api/v1/sources/${encodedSourceId}?${suffix}`
    : `/api/v1/sources/${encodedSourceId}`
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

export function createSource(notebookId: string, payload: CreateSourceRequest) {
  return request<CreateSourceResponse>(
    `/api/v1/notebooks/${encodeURIComponent(notebookId)}/sources`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
}

export function uploadFileSource(sourceId: string, payload: UploadFileSourceRequest) {
  return request<UploadFileSourceResponse>(`/api/v1/sources/${sourceId}/uploads`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function pollSourceStatus(sourceId: string) {
  return request<PollSourceStatusResponse>(`/api/v1/sources/${sourceId}/poll`, {
    method: 'POST',
  })
}

export function retrySourcePreparation(sourceId: string) {
  return request<null>(`/api/v1/sources/${sourceId}/retry`, {
    method: 'POST',
  })
}

export function deleteSource(sourceId: string) {
  return request<null>(`/api/v1/sources/${sourceId}`, {
    method: 'DELETE',
  })
}

interface UpdateSourceRequest {
  title: string
}

export function updateSourceTitle(sourceId: string, payload: UpdateSourceRequest) {
  return request<null>(`/api/v1/sources/${sourceId}`, {
    method: 'PATCH',
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

export function batchGetSourceDocs(sourceId: string, docIds: string[]) {
  const query = new URLSearchParams()
  query.set('ids', docIds.join(','))
  return request<{ docs: GetSourceDocResponse[] }>(
    `/api/v1/sources/${encodeURIComponent(sourceId)}/docs?${query.toString()}`,
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
