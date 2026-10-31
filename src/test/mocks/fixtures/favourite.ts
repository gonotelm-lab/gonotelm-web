import type { Favourite, FavouriteNotebookItem } from '@/types/api'
import { createNotebookSummaryFixture } from './notebook'

export const createFavouriteFixture = (
  overrides: Partial<Favourite> = {},
): Favourite => ({
  id: 'fav-1',
  name: '默认收藏夹',
  notebook_count: 1,
  created_at: Date.UTC(2026, 9, 1),
  ...overrides,
})

export const createFavouriteNotebookItemFixture = (
  overrides: Partial<FavouriteNotebookItem> = {},
): FavouriteNotebookItem => {
  const notebook =
    overrides.notebook ?? createNotebookSummaryFixture({ id: 'nb-fav-1' })
  return {
    notebook_id: notebook.id,
    invalid: false,
    favourited_at: Date.UTC(2026, 9, 2),
    notebook,
    ...overrides,
  }
}
