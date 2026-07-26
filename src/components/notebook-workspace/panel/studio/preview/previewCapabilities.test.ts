import { describe, expect, it } from 'vitest'
import type { StudioArtifactKind } from '@/types/api'
import { getStudioArtifactPreviewCapability } from './previewCapabilities'

describe('getStudioArtifactPreviewCapability', () => {
  it('returns inline+overlay for mindmap', () => {
    expect(getStudioArtifactPreviewCapability('mindmap')).toEqual({
      inline: true,
      overlay: true,
    })
  })

  it('returns inline+overlay for report', () => {
    expect(getStudioArtifactPreviewCapability('report')).toEqual({
      inline: true,
      overlay: true,
    })
  })

  it('returns inline-only preview capability for audio_overview', () => {
    expect(getStudioArtifactPreviewCapability('audio_overview')).toEqual({
      inline: true,
      overlay: false,
    })
  })

  it('returns inline+overlay for flashcard', () => {
    expect(getStudioArtifactPreviewCapability('flashcard')).toEqual({
      inline: true,
      overlay: true,
    })
  })

  it('returns overlay-only preview capability for quiz', () => {
    expect(getStudioArtifactPreviewCapability('quiz')).toEqual({
      inline: false,
      overlay: true,
    })
  })

  it('falls back to overlay-only for unknown kinds', () => {
    expect(getStudioArtifactPreviewCapability('unknown-kind' as StudioArtifactKind)).toEqual({
      inline: false,
      overlay: true,
    })
  })
})
