import { describe, expect, it } from 'vitest'
import { resolveHighlightRange } from './sourcePreviewMarkdown'

const previewText = 'first line\nsecond line\nthird line'

describe('resolveHighlightRange', () => {
  it('prefers position range over snippet when both are provided', () => {
    const range = resolveHighlightRange(previewText, {
      position: { start: 0, end: 5 },
      snippet: 'third line',
    })

    expect(range).not.toBeNull()
    expect(previewText.slice(range!.start, range!.end)).toBe('first')
  })

  it('falls back to snippet when position is missing', () => {
    const range = resolveHighlightRange(previewText, {
      snippet: 'third line',
    })

    expect(range).not.toBeNull()
    expect(previewText.slice(range!.start, range!.end)).toBe('third line')
  })
})
