import type { SourceListItem } from './types/sourceTypes'

export type SourceSortBy = 'recent' | 'title' | 'type'

const compareIdDesc = (a: string, b: string): number => {
  try {
    const left = BigInt(a)
    const right = BigInt(b)
    if (left === right) return 0
    return left > right ? -1 : 1
  } catch {
    return b.localeCompare(a)
  }
}

const titleOf = (item: SourceListItem): string =>
  (item.title || item.name || '').trim()

/**
 * Pure client-side sort of source rows. Does not mutate the input array.
 * - recent: snowflake id DESC (same as API default)
 * - title: localeCompare on display title
 * - type: iconType ASC, then id DESC within the same type
 */
export function sortSourceListItems(
  items: readonly SourceListItem[],
  sortBy: SourceSortBy,
): SourceListItem[] {
  const next = items.slice()
  switch (sortBy) {
    case 'recent':
      next.sort((a, b) => compareIdDesc(a.id, b.id))
      break
    case 'title':
      next.sort((a, b) => {
        const byTitle = titleOf(a).localeCompare(titleOf(b), undefined, {
          sensitivity: 'base',
          numeric: true,
        })
        return byTitle !== 0 ? byTitle : compareIdDesc(a.id, b.id)
      })
      break
    case 'type':
      next.sort((a, b) => {
        const byType = a.iconType.localeCompare(b.iconType)
        return byType !== 0 ? byType : compareIdDesc(a.id, b.id)
      })
      break
  }
  return next
}
