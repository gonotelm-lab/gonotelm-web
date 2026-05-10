import type { SxProps, Theme } from '@mui/material'

export const panelTitleVariant = 'subtitle1' as const

export const panelTitleSx: SxProps<Theme> = {
  fontWeight: 600,
  lineHeight: 1.4,
  letterSpacing: 0.1,
}
