import { describe, expect, it } from 'vitest'
import { sortSourceListItems } from './sortSourceListItems'
import type { SourceListItem } from './types/sourceTypes'

const item = (
  partial: Pick<SourceListItem, 'id' | 'title' | 'iconType'> &
    Partial<SourceListItem>,
): SourceListItem => ({
  kind: 'file',
  name: partial.title,
  ...partial,
})

describe('sortSourceListItems', () => {
  const samples: SourceListItem[] = [
    item({ id: '100', title: 'Zebra', iconType: 'pdf' }),
    item({ id: '300', title: 'Alpha', iconType: 'url' }),
    item({ id: '200', title: 'Beta', iconType: 'pdf' }),
  ]

  it('recent: id 降序', () => {
    expect(sortSourceListItems(samples, 'recent').map((s) => s.id)).toEqual([
      '300',
      '200',
      '100',
    ])
  })

  it('title: 按标题 localeCompare，同名时 id 降序', () => {
    expect(sortSourceListItems(samples, 'title').map((s) => s.title)).toEqual([
      'Alpha',
      'Beta',
      'Zebra',
    ])
  })

  it('type: 按 iconType，同类型内 id 降序', () => {
    expect(
      sortSourceListItems(samples, 'type').map((s) => `${s.iconType}:${s.id}`),
    ).toEqual(['pdf:200', 'pdf:100', 'url:300'])
  })

  it('不修改原数组', () => {
    const original = samples.slice()
    sortSourceListItems(samples, 'title')
    expect(samples.map((s) => s.id)).toEqual(original.map((s) => s.id))
  })
})
