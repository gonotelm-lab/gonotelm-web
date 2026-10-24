import { workspaceLayout, workspaceSpace } from '../../shared/ui/layoutTokens'

export const chatPanelLayoutTokens = {
  horizontalPadding: {
    xs: workspaceSpace.lg,
    md: workspaceLayout.panelPaddingX,
  },
  verticalPadding: workspaceLayout.panelPaddingY,
  /** 底边贴紧免责声明，避免小字下方留大块空白。 */
  bottomPadding: workspaceSpace.xxs,
} as const

export const chatMessageContentTokens = {
  sideMarginX: workspaceSpace.sm,
  scrollInnerPaddingX: chatPanelLayoutTokens.horizontalPadding,
  messageGap: workspaceLayout.chatMessageGap,
} as const
