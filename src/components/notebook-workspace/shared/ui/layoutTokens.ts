/** MUI spacing units (theme.spacing = 8px). Locked: 4 / 8 / 12 / 16 / 24 px. */
export const workspaceSpace = {
  xxs: 0.5,
  sm: 1,
  md: 1.5,
  lg: 2,
  xl: 3,
} as const

export const workspaceRadiusPx = {
  sm: 8,
  md: 10,
  lg: 12,
} as const

export const workspaceRadius = {
  sm: `${workspaceRadiusPx.sm}px`,
  md: `${workspaceRadiusPx.md}px`,
  lg: `${workspaceRadiusPx.lg}px`,
} as const

export const workspaceLayout = {
  panelPaddingX: workspaceSpace.xl,
  panelPaddingY: workspaceSpace.lg,
  panelTitleToBody: workspaceSpace.md,
  listRowGap: workspaceSpace.sm,
  listInlineGap: workspaceSpace.sm,
  chatMessageGap: workspaceSpace.lg,
} as const

export type WorkspaceSpace = typeof workspaceSpace
export type WorkspaceLayout = typeof workspaceLayout
