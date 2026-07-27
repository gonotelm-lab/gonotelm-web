import { request } from '../lib/http'
import type {
  CreateNotebookRequest,
  CreateNotebookResponse,
  GetNotebookChatResponse,
  ListNotebookSourcesResponse,
  ListNotebooksResponse,
  ListNotebooksSortBy,
  Notebook,
} from '../types/api'

export function createNotebook(payload: CreateNotebookRequest) {
  return request<CreateNotebookResponse>('/api/v1/notebooks', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getNotebook(id: string) {
  return request<Notebook>(`/api/v1/notebooks/${id}`)
}

export function deleteNotebook(id: string) {
  return request<null>(`/api/v1/notebooks/${id}`, {
    method: 'DELETE',
  })
}

export function getOrCreateNotebookChat(id: string) {
  return request<GetNotebookChatResponse>(`/api/v1/notebooks/${id}/chats`, {
    method: 'POST',
  })
}

interface UpdateNotebookRequest {
  name: string
}

export function updateNotebookName(
  id: string,
  payload: UpdateNotebookRequest,
) {
  return request<null>(`/api/v1/notebooks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

interface ListNotebooksParams {
  limit?: number
  offset?: number
  sortBy?: ListNotebooksSortBy
}

export function listNotebooks(params: ListNotebooksParams = {}) {
  const query = new URLSearchParams()
  if (typeof params.limit === 'number') {
    query.set('limit', String(params.limit))
  }
  if (typeof params.offset === 'number') {
    query.set('offset', String(params.offset))
  }
  if (typeof params.sortBy === 'string') {
    query.set('sort_by', params.sortBy)
  }

  const suffix = query.toString()
  const path = suffix ? `/api/v1/notebooks?${suffix}` : '/api/v1/notebooks'
  return request<ListNotebooksResponse>(path)
}

interface ListNotebookSourcesParams {
  limit?: number
  offset?: number
}

export function listNotebookSources(
  notebookId: string,
  params: ListNotebookSourcesParams = {},
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
    ? `/api/v1/notebooks/${notebookId}/sources?${suffix}`
    : `/api/v1/notebooks/${notebookId}/sources`
  return request<ListNotebookSourcesResponse>(path)
}
