import type { SxProps, Theme } from '@mui/material'

export const panelTitleVariant = 'subtitle1' as const

export const panelTitleSx: SxProps<Theme> = {
  fontWeight: 600,
  lineHeight: 1.4,
  letterSpacing: 0.1,
}

// 统一三栏（来源/对话/工作区）标题到底部主体内容的垂直间距。
export const panelTitleToBodySpacing = 1.25
