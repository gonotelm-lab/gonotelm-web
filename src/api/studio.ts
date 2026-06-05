import { ApiError, request } from '../lib/http'
import type {
  GenerateStudioArtifactRequest,
  GenerateStudioArtifactResponse,
  GetStudioArtifactStatusResponse,
  ListNotebookStudioArtifactsResponse,
  StudioArtifactResult,
} from '../types/api'

export function generateStudioArtifact(payload: GenerateStudioArtifactRequest) {
  return request<GenerateStudioArtifactResponse>('/api/v1/studio/artifact/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getStudioArtifactStatus(taskId: string) {
  return request<GetStudioArtifactStatusResponse>(
    `/api/v1/studio/artifact/${encodeURIComponent(taskId)}/status`,
    {
      method: 'GET',
    },
  )
}

export function getStudioArtifactResult(taskId: string) {
  return request<StudioArtifactResult>(
    `/api/v1/studio/artifact/${encodeURIComponent(taskId)}/result`,
    {
      method: 'GET',
    },
  )
}

export function deleteStudioArtifact(taskId: string) {
  return request<null>(`/api/v1/studio/artifact/${encodeURIComponent(taskId)}/delete`, {
    method: 'POST',
  })
}

export function retryStudioArtifactTask(taskId: string) {
  return request<null>(`/api/v1/studio/artifact/${encodeURIComponent(taskId)}/retry`, {
    method: 'POST',
  })
}

export function cancelStudioArtifactTask(taskId: string) {
  return request<null>(`/api/v1/studio/artifact/${encodeURIComponent(taskId)}/cancel`, {
    method: 'POST',
  })
}

interface ListNotebookStudioArtifactsParams {
  limit?: number
  offset?: number
}

export function listNotebookStudioArtifacts(
  notebookId: string,
  params: ListNotebookStudioArtifactsParams = {},
) {
  const query = new URLSearchParams()
  if (typeof params.limit === 'number') {
    query.set('limit', String(params.limit))
  }
  if (typeof params.offset === 'number') {
    query.set('offset', String(params.offset))
  }

  const suffix = query.toString()
  const path = suffix
    ? `/api/v1/notebook/${encodeURIComponent(notebookId)}/studio/artifact/list?${suffix}`
    : `/api/v1/notebook/${encodeURIComponent(notebookId)}/studio/artifact/list`
  return request<ListNotebookStudioArtifactsResponse>(path)
}

export async function loadStudioArtifactContentFromUrl(url: string) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new ApiError(`产物内容读取失败，HTTP ${response.status}`, -1, response.status)
  }
  return response.text()
}
