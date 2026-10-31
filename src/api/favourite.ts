import { request } from '../lib/http'
import type {
  AddFavouriteNotebookRequest,
  CreateFavouriteRequest,
  CreateFavouriteResponse,
  Favourite,
  ListFavouriteNotebooksResponse,
  ListFavouritesResponse,
  RemoveFavouriteNotebooksRequest,
  RenameFavouriteRequest,
} from '../types/api'

interface ListFavouritesParams {
  limit?: number
  offset?: number
}

interface ListFavouriteNotebooksParams {
  favouriteId: string
  limit?: number
  offset?: number
}

export function listFavourites(params: ListFavouritesParams = {}) {
  const query = new URLSearchParams()
  if (typeof params.limit === 'number') {
    query.set('limit', String(params.limit))
  }
  if (typeof params.offset === 'number') {
    query.set('offset', String(params.offset))
  }
  const suffix = query.toString()
  return request<ListFavouritesResponse>(
    `/api/v1/favourites${suffix ? `?${suffix}` : ''}`,
  )
}

export function createFavourite(payload: CreateFavouriteRequest) {
  return request<CreateFavouriteResponse>('/api/v1/favourites', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function renameFavourite(id: string, payload: RenameFavouriteRequest) {
  return request<Favourite>(`/api/v1/favourites/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteFavourite(id: string) {
  return request<null>(`/api/v1/favourites/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export function listFavouriteNotebooks(params: ListFavouriteNotebooksParams) {
  const query = new URLSearchParams()
  if (typeof params.limit === 'number') {
    query.set('limit', String(params.limit))
  }
  if (typeof params.offset === 'number') {
    query.set('offset', String(params.offset))
  }
  const suffix = query.toString()
  return request<ListFavouriteNotebooksResponse>(
    `/api/v1/favourites/${encodeURIComponent(params.favouriteId)}/notebooks${
      suffix ? `?${suffix}` : ''
    }`,
  )
}

export function addFavouriteNotebook(
  favouriteId: string,
  payload: AddFavouriteNotebookRequest,
) {
  return request<null>(
    `/api/v1/favourites/${encodeURIComponent(favouriteId)}/notebooks`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
}

export function removeFavouriteNotebooks(
  favouriteId: string,
  payload: RemoveFavouriteNotebooksRequest,
) {
  return request<null>(
    `/api/v1/favourites/${encodeURIComponent(favouriteId)}/notebooks`,
    {
      method: 'DELETE',
      body: JSON.stringify(payload),
    },
  )
}
