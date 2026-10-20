import { describe, expect, it } from 'vitest'
import { createNotebookAccessFixture } from '@/test/mocks/fixtures/notebook'
import { isNotebookOwner } from './useNotebookAccessQuery'

describe('isNotebookOwner', () => {
  it('owner 才返回 true', () => {
    expect(
      isNotebookOwner(createNotebookAccessFixture({ role: 'owner' })),
    ).toBe(true)
  })

  it.each(['collaborator', 'viewer'])('%s 返回 false', (role) => {
    expect(isNotebookOwner(createNotebookAccessFixture({ role }))).toBe(false)
  })

  it('access 尚未加载时返回 false，分享入口保持隐藏', () => {
    expect(isNotebookOwner(undefined)).toBe(false)
  })
})
