/**
 * Locked type scale (px): 12 / 14 / 16 / 18 / 20
 * Aligns with ui-ux-pro-max modular scale + Indigo Porcelain T2 (Noto Sans SC / JetBrains Mono).
 */
export const workspaceType = {
  xs: 12,
  sm: 14,
  md: 16,
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
  md: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
} as const

export type WorkspaceType = typeof workspaceType
export type WorkspaceIconSize = typeof workspaceIconSize
