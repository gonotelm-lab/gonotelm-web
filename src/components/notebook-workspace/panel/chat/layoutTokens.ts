import { workspaceLayout, workspaceSpace } from '../../shared/ui/layoutTokens'

export const chatPanelLayoutTokens = {
  horizontalPadding: {
    xs: workspaceSpace.lg,
    md: workspaceLayout.panelPaddingX,
  },
  verticalPadding: workspaceLayout.panelPaddingY,
} as const

export const chatMessageContentTokens = {
  sideMarginX: workspaceSpace.sm,
  scrollInnerPaddingX: chatPanelLayoutTokens.horizontalPadding,
  messageGap: workspaceLayout.chatMessageGap,
} as const
