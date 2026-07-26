import { describe, expect, it } from 'vitest'
import { resolveNotebookWorkspaceTitle } from './resolveNotebookWorkspaceTitle'

describe('resolveNotebookWorkspaceTitle', () => {
  it('prefers query name when store was reset to empty (HMR/remount)', () => {
    expect(
      resolveNotebookWorkspaceTitle({
        isEditing: false,
        draftName: '',
        storeName: '',
        queryName: 'Rust 并发',
      }),
    ).toBe('Rust 并发')
  })

  it('uses draft while editing so store reset does not blank the input', () => {
    expect(
      resolveNotebookWorkspaceTitle({
        isEditing: true,
        draftName: '编辑中的标题',
        storeName: '',
        queryName: '旧标题',
      }),
    ).toBe('编辑中的标题')
  })

  it('keeps non-empty store name when not editing', () => {
    expect(
      resolveNotebookWorkspaceTitle({
        isEditing: false,
        draftName: '',
        storeName: '本地乐观标题',
        queryName: '服务端标题',
      }),
    ).toBe('本地乐观标题')
  })

  it('returns empty when both store and query are empty', () => {
    expect(
      resolveNotebookWorkspaceTitle({
        isEditing: false,
        draftName: '',
        storeName: '',
        queryName: '',
      }),
    ).toBe('')
  })
})
