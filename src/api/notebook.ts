import { request } from '../lib/http'
import type {
  CreateNotebookRequest,
  CreateNotebookResponse,
  ListNotebookSourcesResponse,
  ListNotebooksResponse,
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

interface ListNotebooksParams {
  limit?: number
  offset?: number
}

export function listNotebooks(params: ListNotebooksParams = {}) {
  const query = new URLSearchParams()
  if (typeof params.limit === 'number') {
    query.set('limit', String(params.limit))
  }
  if (typeof params.offset === 'number') {
    query.set('offset', String(params.offset))
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
