import { workspaceLayout, workspaceRadius, workspaceSpace } from './layoutTokens'

/** Shared density for Workspace settings dialogs (Studio + Chat). */
export const workspaceDialogLayout = {
  sectionStackSpacing: workspaceSpace.lg,
  helperTextMt: workspaceSpace.xxs,
  controlMt: workspaceSpace.md,
  captionMt: workspaceSpace.sm,
  toggleGap: workspaceSpace.sm,
  paperRadius: workspaceRadius.lg,
  contentPaddingX: workspaceLayout.panelPaddingY,
  actionsGap: workspaceSpace.sm,
} as const
