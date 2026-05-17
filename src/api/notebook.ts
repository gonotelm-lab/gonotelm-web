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
  return request<CreateNotebookResponse>('/api/v1/notebook', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getNotebook(id: string) {
  return request<Notebook>(`/api/v1/notebook/${id}`)
}

export function getOrCreateNotebookChat(id: string) {
  return request<GetNotebookChatResponse>(`/api/v1/notebook/${id}/chat`, {
    method: 'POST',
  })
}

interface UpdateNotebookNameRequest {
  name: string
}

export function updateNotebookName(
  id: string,
  payload: UpdateNotebookNameRequest,
) {
  return request<null>(`/api/v1/notebook/${id}/name`, {
    method: 'PUT',
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
  const path = suffix ? `/api/v1/notebook/list?${suffix}` : '/api/v1/notebook/list'
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
    ? `/api/v1/notebook/${notebookId}/source/list?${suffix}`
    : `/api/v1/notebook/${notebookId}/source/list`
  return request<ListNotebookSourcesResponse>(path)
}
