import { describe, expect, it } from 'vitest'
import { getSourcePreviewCapability } from './sourcePreviewCapabilities'

describe('getSourcePreviewCapability', () => {
  it('content 视图支持内联、放大和下载', () => {
    expect(getSourcePreviewCapability('content')).toEqual({
      inline: true,
      overlay: true,
      downloadable: true,
    })
  })

  it('tree 视图支持内联和放大，不支持下载', () => {
    expect(getSourcePreviewCapability('tree')).toEqual({
      inline: true,
      overlay: true,
      downloadable: false,
    })
  })
})
