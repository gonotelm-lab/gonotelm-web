import { ApiError, request } from '../lib/http'
import type {
  ConvertNoteToSourceResponse,
  GenerateStudioArtifactRequest,
  GenerateStudioArtifactResponse,
  GetStudioArtifactStatusResponse,
  ListNotebookStudioArtifactsResponse,
  StudioArtifactResult,
  UpdateStudioArtifactRequest,
} from '../types/api'

export function generateStudioArtifact(
  notebookId: string,
  payload: GenerateStudioArtifactRequest,
) {
  return request<GenerateStudioArtifactResponse>(
    `/api/v1/notebooks/${encodeURIComponent(notebookId)}/artifacts`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
}

export function getStudioArtifactStatus(taskId: string) {
  return request<GetStudioArtifactStatusResponse>(
    `/api/v1/artifacts/${encodeURIComponent(taskId)}/status`,
    {
      method: 'GET',
    },
  )
}

export function getStudioArtifact(taskId: string) {
  return request<StudioArtifactResult>(
    `/api/v1/artifacts/${encodeURIComponent(taskId)}`,
    {
      method: 'GET',
    },
  )
}

export function deleteStudioArtifact(taskId: string) {
  return request<null>(`/api/v1/artifacts/${encodeURIComponent(taskId)}`, {
    method: 'DELETE',
  })
}

export function updateStudioArtifact(
  taskId: string,
  payload: UpdateStudioArtifactRequest,
) {
  return request<null>(`/api/v1/artifacts/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function retryStudioArtifactTask(taskId: string) {
  return request<null>(`/api/v1/artifacts/${encodeURIComponent(taskId)}/retry`, {
    method: 'POST',
  })
}

export function cancelStudioArtifactTask(taskId: string) {
  return request<null>(`/api/v1/artifacts/${encodeURIComponent(taskId)}/cancel`, {
    method: 'POST',
  })
}

export function convertNoteToSource(taskId: string) {
  return request<ConvertNoteToSourceResponse>(
    `/api/v1/artifacts/${encodeURIComponent(taskId)}/convert`,
    {
      method: 'POST',
    },
  )
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
    ? `/api/v1/notebooks/${encodeURIComponent(notebookId)}/artifacts?${suffix}`
    : `/api/v1/notebooks/${encodeURIComponent(notebookId)}/artifacts`
  return request<ListNotebookStudioArtifactsResponse>(path)
}

export async function loadStudioArtifactContentFromUrl(url: string) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new ApiError(`产物内容读取失败，HTTP ${response.status}`, -1, response.status)
  }
  return response.text()
}
