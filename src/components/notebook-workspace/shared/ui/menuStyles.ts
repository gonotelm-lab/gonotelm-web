import type { Theme } from '@mui/material/styles'
import { workspaceSpace } from './layoutTokens'
import { subtleScrollbarSx } from './scrollbar'
import { resolveWorkspaceElevation } from './workspaceElevation'
import { workspaceIconSize } from './typeTokens'

/** 下拉菜单项的度量：图标与文字同一步距，菜单项左右对齐头像菜单。 */
export const headerMenuItemSx = {
  gap: workspaceSpace.md,
  px: workspaceSpace.md,
} as const

export const headerMenuIconSx = {
  fontSize: workspaceIconSize.md,
  color: 'text.secondary',
} as const

/**
 * 顶栏下拉菜单（账号菜单 / 更多选项）共用的纸面外观。
 * MUI 默认 elevation=8 是三段 Material 重投影，和全站的 hairline 语言冲突，统一关掉。
 */
export const headerMenuPaperSx = (theme: Theme) => ({
  minWidth: 160,
  maxWidth: 280,
  mt: workspaceSpace.xxs,
  border: '1px solid',
  borderColor: 'divider',
  boxShadow: resolveWorkspaceElevation(theme).menu,
  // MUI 默认 calc(100% - 96px) 预留上下各 48px，矮窗口里会把两行菜单也压成滚动区。
  // 16px 是 Popover 的 marginThreshold，两侧各留 16px 已经够点外面关闭了。
  maxHeight: 'calc(100vh - 32px)',
  ...subtleScrollbarSx(theme),
})
