/**
 * Locked type scale (px): 12 / 14 / 18 / 20
 * No 16 step — body and chrome share 14 for denser reading.
 */
export const workspaceType = {
  xs: 12,
  sm: 14,
  lg: 18,
  xl: 20,
  mono: 14,
} as const

/** Icon glyph sizes (not body type). Prefer these over ad-hoc 14.5 / 17 / 19. */
export const workspaceIconSize = {
  sm: 16,
  md: 18,
  lg: 20,
  xl: 32,
} as const

export const workspaceTypeRem = {
  xs: '0.75rem',
  sm: '0.875rem',
  lg: '1.125rem',
  xl: '1.25rem',
} as const

export type WorkspaceType = typeof workspaceType
export type WorkspaceIconSize = typeof workspaceIconSize
