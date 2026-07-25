import { describe, expect, it } from 'vitest'
import type { StudioArtifactKind } from '@/types/api'
import { resolveStudioPreviewEntryMode } from './previewRouting'

describe('resolveStudioPreviewEntryMode', () => {
  it('returns none for non-completed tasks', () => {
    expect(
      resolveStudioPreviewEntryMode({
        kind: 'mindmap',
        status: 'running',
      }),
    ).toBe('none')
  })

  it('routes completed mindmap to inline mode', () => {
    expect(
      resolveStudioPreviewEntryMode({
        kind: 'mindmap',
        status: 'completed',
      }),
    ).toBe('inline')
  })

  it('routes completed report to inline mode', () => {
    expect(
      resolveStudioPreviewEntryMode({
        kind: 'report',
        status: 'completed',
      }),
    ).toBe('inline')
  })

  it('routes completed audio_overview to inline mode', () => {
    expect(
      resolveStudioPreviewEntryMode({
        kind: 'audio_overview',
        status: 'completed',
      }),
    ).toBe('inline')
  })

  it('routes completed unknown kinds to overlay mode', () => {
    expect(
      resolveStudioPreviewEntryMode({
        kind: 'unknown-kind' as StudioArtifactKind,
        status: 'completed',
      }),
    ).toBe('overlay')
  })
})
