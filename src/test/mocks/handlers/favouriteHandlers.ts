import { http } from 'msw'
import type {
  CreateFavouriteRequest,
  Favourite,
  FavouriteNotebookItem,
  RemoveFavouriteNotebooksRequest,
  RenameFavouriteRequest,
} from '@/types/api'
import {
  createFavouriteFixture,
  createFavouriteNotebookItemFixture,
} from '../fixtures/favourite'
import { createSuccessResponse } from './httpResponse'

const apiBaseUrl = ''

let favouritesStore: Favourite[] = [createFavouriteFixture()]
let notebookItemsByFavouriteId: Record<string, FavouriteNotebookItem[]> = {
  'fav-1': [createFavouriteNotebookItemFixture()],
}

const syncCounts = () => {
  favouritesStore = favouritesStore.map((favourite) => ({
    ...favourite,
    notebook_count: notebookItemsByFavouriteId[favourite.id]?.length ?? 0,
  }))
}

export const favouriteHandlers = [
  http.get(`${apiBaseUrl}/api/v1/favourites`, async ({ request }) => {
    const url = new URL(request.url)
    const limit = Number(url.searchParams.get('limit') ?? 20)
    const offset = Number(url.searchParams.get('offset') ?? 0)
    const slice = favouritesStore.slice(offset, offset + limit)
    return createSuccessResponse({
      favourites: slice,
      limit,
      offset,
      has_more: offset + slice.length < favouritesStore.length,
    })
  }),

  http.post(`${apiBaseUrl}/api/v1/favourites`, async ({ request }) => {
    const body = (await request.json()) as CreateFavouriteRequest
    const id = `fav-${Date.now()}`
    favouritesStore = [
      createFavouriteFixture({
        id,
        name: body.name?.trim() || '未命名收藏夹',
        notebook_count: 0,
        created_at: Date.now(),
      }),
      ...favouritesStore,
    ]
    notebookItemsByFavouriteId[id] = []
    return createSuccessResponse({ id })
  }),

  http.patch(`${apiBaseUrl}/api/v1/favourites/:id`, async ({ params, request }) => {
    const id = String(params.id)
    const body = (await request.json()) as RenameFavouriteRequest
    favouritesStore = favouritesStore.map((favourite) =>
      favourite.id === id
        ? { ...favourite, name: body.name?.trim() || favourite.name }
        : favourite,
    )
    const updated = favouritesStore.find((favourite) => favourite.id === id)
    return createSuccessResponse(updated ?? createFavouriteFixture({ id }))
  }),

  http.delete(`${apiBaseUrl}/api/v1/favourites/:id`, async ({ params }) => {
    const id = String(params.id)
    favouritesStore = favouritesStore.filter((favourite) => favourite.id !== id)
    delete notebookItemsByFavouriteId[id]
    return createSuccessResponse(null)
  }),

  http.get(`${apiBaseUrl}/api/v1/favourites/:id/notebooks`, async ({ params, request }) => {
    const id = String(params.id)
    const url = new URL(request.url)
    const limit = Number(url.searchParams.get('limit') ?? 20)
    const offset = Number(url.searchParams.get('offset') ?? 0)
    const items = notebookItemsByFavouriteId[id] ?? []
    const slice = items.slice(offset, offset + limit)
    return createSuccessResponse({
      items: slice,
      limit,
      offset,
      has_more: offset + slice.length < items.length,
    })
  }),

  http.post(`${apiBaseUrl}/api/v1/favourites/:id/notebooks`, async ({ params, request }) => {
    const id = String(params.id)
    const body = (await request.json()) as { notebook_id: string }
    const existing = notebookItemsByFavouriteId[id] ?? []
    if (!existing.some((item) => item.notebook_id === body.notebook_id)) {
      notebookItemsByFavouriteId[id] = [
        createFavouriteNotebookItemFixture({
          notebook_id: body.notebook_id,
          notebook: {
            id: body.notebook_id,
            name: '已加入的笔记本',
            desc: '',
            flags: { customize_description: false },
            source_count: 0,
            updated_at: Date.now(),
          },
          favourited_at: Date.now(),
        }),
        ...existing,
      ]
      syncCounts()
    }
    return createSuccessResponse(null)
  }),

  http.delete(`${apiBaseUrl}/api/v1/favourites/:id/notebooks`, async ({ params, request }) => {
    const id = String(params.id)
    const body = (await request.json()) as RemoveFavouriteNotebooksRequest
    const removeIds = new Set(body.notebook_ids ?? [])
    notebookItemsByFavouriteId[id] = (notebookItemsByFavouriteId[id] ?? []).filter(
      (item) => !removeIds.has(item.notebook_id),
    )
    syncCounts()
    return createSuccessResponse(null)
  }),
]
