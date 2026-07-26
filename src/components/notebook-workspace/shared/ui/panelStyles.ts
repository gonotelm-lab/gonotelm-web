import type { SxProps, Theme } from '@mui/material'
import { workspaceLayout } from './layoutTokens'

export const panelTitleVariant = 'subtitle1' as const

export const panelTitleSx: SxProps<Theme> = {
  fontWeight: 600,
  lineHeight: 1.35,
  letterSpacing: '0.01em',
  color: 'text.primary',
}

// 统一三栏（来源/对话/工作区）标题到底部主体内容的垂直间距。
export const panelTitleToBodySpacing = workspaceLayout.panelTitleToBody
