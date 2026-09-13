import { describe, expect, it } from 'vitest'
import { resolveStudioArtifactDownload } from './resolveStudioArtifactDownload'

describe('resolveStudioArtifactDownload', () => {
  it('downloads slides from contentUrl as pptx even when content is empty', () => {
    expect(
      resolveStudioArtifactDownload({
        kind: 'slides',
        title: 'Weekly Deck',
        content: '',
        contentUrl: 'https://cdn.example.com/deck.pptx',
      }),
    ).toEqual({
      type: 'url',
      url: 'https://cdn.example.com/deck.pptx',
      filename: 'Weekly_Deck.pptx',
    })
  })

  it('returns null for slides when contentUrl is blank', () => {
    expect(
      resolveStudioArtifactDownload({
        kind: 'slides',
        title: 'Weekly Deck',
        content: '',
        contentUrl: '   ',
      }),
    ).toBeNull()
  })

  it('downloads video_overview from contentUrl as mp4 even when content is empty', () => {
    expect(
      resolveStudioArtifactDownload({
        kind: 'video_overview',
        title: 'Kickoff Video',
        content: '',
        contentUrl: 'https://cdn.example.com/kickoff.mp4',
      }),
    ).toEqual({
      type: 'url',
      url: 'https://cdn.example.com/kickoff.mp4',
      filename: 'Kickoff_Video.mp4',
    })
  })

  it('returns null for video_overview when contentUrl is blank', () => {
    expect(
      resolveStudioArtifactDownload({
        kind: 'video_overview',
        title: 'Kickoff Video',
        content: '',
        contentUrl: '',
      }),
    ).toBeNull()
  })
})
