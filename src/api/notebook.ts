import { request } from '../lib/http'
import type {
  CreateNotebookRequest,
  CreateNotebookResponse,
  GetNotebookChatResponse,
  GetNotebookSharingResponse,
  ListNotebookSourcesResponse,
  ListNotebooksResponse,
  ListNotebooksScope,
  ListNotebooksSortBy,
  Notebook,
  NotebookAccess,
  NotebookVisibility,
  UpsertNotebookMemberRequest,
  UpsertNotebookMemberResponse,
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
  scope?: ListNotebooksScope
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
  if (typeof params.scope === 'string') {
    query.set('scope', params.scope)
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

export function generateNotebookDescription(id: string) {
  return request<{ desc: string }>(
    `/api/v1/notebooks/${encodeURIComponent(id)}/description/generation`,
    {
      method: 'POST',
    },
  )
}

/** 当前账号对这个笔记本能做什么（分享入口用它判断是否可管理）。 */
export function getNotebookAccess(id: string) {
  return request<NotebookAccess>(
    `/api/v1/notebooks/${encodeURIComponent(id)}/access`,
  )
}

export function getNotebookSharing(id: string) {
  return request<GetNotebookSharingResponse>(
    `/api/v1/notebooks/${encodeURIComponent(id)}/sharing`,
  )
}

export function updateNotebookVisibility(
  id: string,
  visibility: NotebookVisibility,
) {
  return request<null>(
    `/api/v1/notebooks/${encodeURIComponent(id)}/visibility`,
    {
      method: 'PATCH',
      body: JSON.stringify({ visibility }),
    },
  )
}

export function upsertNotebookMember(
  id: string,
  payload: UpsertNotebookMemberRequest,
) {
  return request<UpsertNotebookMemberResponse>(
    `/api/v1/notebooks/${encodeURIComponent(id)}/sharing/members`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  )
}

export function deleteNotebookMember(id: string, userId: string) {
  return request<null>(
    `/api/v1/notebooks/${encodeURIComponent(id)}/sharing/members/${encodeURIComponent(userId)}`,
    {
      method: 'DELETE',
    },
  )
}
