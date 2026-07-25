import { describe, expect, it } from 'vitest'
import { resolveSourcePreviewEntryMode } from './sourcePreviewRouting'

describe('resolveSourcePreviewEntryMode', () => {
  it('ready 状态下 content 走 inline', () => {
    expect(resolveSourcePreviewEntryMode({
      viewType: 'content',
      status: 'ready',
    })).toBe('inline')
  })

  it('非 ready 状态不允许打开预览', () => {
    expect(resolveSourcePreviewEntryMode({
      viewType: 'content',
      status: 'uploading',
    })).toBe('none')
  })
})
