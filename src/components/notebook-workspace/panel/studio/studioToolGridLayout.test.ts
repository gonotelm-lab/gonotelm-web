import { describe, expect, it } from 'vitest'
import {
  studioToolGridContainerSx,
  studioToolGridSx,
  studioToolGridThreeColMinPx,
  studioToolGridTwoColMinPx,
} from './studioToolGridLayout'

describe('studioToolGridLayout', () => {
  it('keeps ascending column breakpoints', () => {
    expect(studioToolGridTwoColMinPx).toBeLessThan(studioToolGridThreeColMinPx)
    expect(studioToolGridTwoColMinPx).toBeGreaterThan(0)
  })

  it('separates containment context from the queried grid', () => {
    expect(studioToolGridContainerSx.containerType).toBe('inline-size')
    expect(studioToolGridSx).not.toHaveProperty('containerType')
  })

  it('defaults to one column then steps up via container queries', () => {
    expect(studioToolGridSx.gridTemplateColumns).toBe('repeat(1, minmax(0, 1fr))')
    expect(
      studioToolGridSx[`@container (min-width: ${studioToolGridTwoColMinPx}px)`]
        .gridTemplateColumns,
    ).toBe('repeat(2, minmax(0, 1fr))')
    expect(
      studioToolGridSx[`@container (min-width: ${studioToolGridThreeColMinPx}px)`]
        .gridTemplateColumns,
    ).toBe('repeat(3, minmax(0, 1fr))')
  })
})
