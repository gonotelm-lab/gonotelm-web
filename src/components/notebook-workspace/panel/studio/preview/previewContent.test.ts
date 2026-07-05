import { describe, expect, it } from 'vitest'
import { hasStudioArtifactPreviewContent } from './previewContent'

describe('hasStudioArtifactPreviewContent', () => {
  it('disables preview content for audio_overview', () => {
    expect(hasStudioArtifactPreviewContent('audio_overview', 'text', 'https://example.com/a.mp3')).toBe(
      false,
    )
  })

  it('treats info_graphic preview as content_url based', () => {
    expect(hasStudioArtifactPreviewContent('info_graphic', '', 'https://example.com/a.png')).toBe(true)
    expect(hasStudioArtifactPreviewContent('info_graphic', 'ignored', '')).toBe(false)
  })

  it('treats text artifacts as content based', () => {
    expect(hasStudioArtifactPreviewContent('report', '# title', '')).toBe(true)
    expect(hasStudioArtifactPreviewContent('mindmap', '', '')).toBe(false)
  })
})
