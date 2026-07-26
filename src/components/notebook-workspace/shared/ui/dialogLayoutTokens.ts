import { workspaceRadius, workspaceSpace } from './layoutTokens'

/** Shared density for Workspace settings dialogs (Studio + Chat). */
export const workspaceDialogLayout = {
  sectionStackSpacing: workspaceSpace.lg,
  helperTextMt: workspaceSpace.xxs,
  controlMt: workspaceSpace.md,
  captionMt: workspaceSpace.sm,
  toggleGap: workspaceSpace.sm,
  paperRadius: workspaceRadius.lg,
  /** Dialog content horizontal padding (denser than panel shell xl). */
  contentPaddingX: workspaceSpace.lg,
  titlePaddingBottom: workspaceSpace.sm,
  contentPaddingTop: workspaceSpace.sm,
  actionsGap: workspaceSpace.sm,
} as const
