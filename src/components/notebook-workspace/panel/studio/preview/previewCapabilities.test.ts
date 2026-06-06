import { describe, expect, it } from 'vitest'
import { getStudioArtifactPreviewCapability } from './previewCapabilities'

describe('getStudioArtifactPreviewCapability', () => {
  it('returns inline+overlay for mindmap', () => {
    expect(getStudioArtifactPreviewCapability('mindmap')).toEqual({
      inline: true,
      overlay: true,
    })
  })

  it('falls back to overlay-only for unknown kinds', () => {
    expect(getStudioArtifactPreviewCapability('reports')).toEqual({
      inline: false,
      overlay: true,
    })
  })
})
