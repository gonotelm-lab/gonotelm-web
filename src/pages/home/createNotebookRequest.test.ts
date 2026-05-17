import { describe, expect, it } from 'vitest'
import { buildCreateNotebookRequest } from './createNotebookRequest'

describe('buildCreateNotebookRequest', () => {
  it('with-name 模式传入裁剪后的名称', () => {
    const payload = buildCreateNotebookRequest('  Rust 并发实战  ', 'with-name')

    expect(payload).toEqual({
      name: 'Rust 并发实战',
      desc: '',
    })
  })

  it('later 模式强制传空名称', () => {
    const payload = buildCreateNotebookRequest('这个值会被忽略', 'later')

    expect(payload).toEqual({
      name: '',
      desc: '',
    })
  })
})
