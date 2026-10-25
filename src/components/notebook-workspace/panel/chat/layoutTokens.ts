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
  /** 聊天内容列最大宽度（封面列）：大屏两侧留白。 */
  contentMaxWidth: 840,
  /** 正文可读列（摘要 + 聊天记录）：比封面略窄并居中。 */
  readableContentMaxWidth: 760,
} as const

/**
 * 聊天面板统一内容列：顶栏、消息列表、输入框共用，
 * 保证三者的左右边界完全一致（大屏时统一居中留白）。
 */
export const chatContentColumnSx = {
  width: '100%',
  maxWidth: chatMessageContentTokens.contentMaxWidth,
  mx: 'auto',
  px: chatPanelLayoutTokens.horizontalPadding,
} as const

/**
 * 可读列：消息、摘要、输入框、顶栏共用的最终内容宽度。
 * 比封面列（840）略窄，始终居中。
 */
export const chatReadableColumnSx = {
  width: '100%',
  maxWidth: chatMessageContentTokens.readableContentMaxWidth,
  mx: 'auto',
} as const
