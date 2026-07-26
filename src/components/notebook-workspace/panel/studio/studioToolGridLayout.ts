import { workspaceLayout } from '../../shared/ui/layoutTokens'

/** Min tool-grid container width (px) to use 2 columns. */
export const studioToolGridTwoColMinPx = 240

/** Min tool-grid container width (px) to use 3 columns. */
export const studioToolGridThreeColMinPx = 360

/**
 * Outer containment context. `@container` queries do not apply to the same
 * element that establishes the container — keep this wrapper separate from the grid.
 */
export const studioToolGridContainerSx = {
  containerType: 'inline-size',
  width: '100%',
  minWidth: 0,
} as const

/**
 * Inner CSS container-query grid: 1 → 2 → 3 columns by parent container width.
 */
export const studioToolGridSx = {
  display: 'grid',
  gap: workspaceLayout.listRowGap,
  gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
  [`@container (min-width: ${studioToolGridTwoColMinPx}px)`]: {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
  [`@container (min-width: ${studioToolGridThreeColMinPx}px)`]: {
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  },
} as const
