import { describe, expect, it } from 'vitest'
import { hasStudioArtifactPreviewContent } from './previewContent'

describe('hasStudioArtifactPreviewContent', () => {
  it('enables preview content for audio_overview when content_url is present', () => {
    expect(hasStudioArtifactPreviewContent('audio_overview', '', 'https://example.com/a.wav')).toBe(true)
    expect(hasStudioArtifactPreviewContent('audio_overview', '', '')).toBe(false)
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
