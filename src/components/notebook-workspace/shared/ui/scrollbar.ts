import type { Theme } from '@mui/material/styles'

const defaultHoverThumbColor = 'rgba(21, 42, 74, 0.18)'

const resolveHoverThumbColor = (theme: Theme) => {
  const scrollbar = theme.workspacePalette?.scrollbar
  if (!scrollbar) {
    return defaultHoverThumbColor
  }
  return `rgba(${scrollbar.hoverThumbRgb}, ${scrollbar.hoverThumbOpacity})`
}

export const subtleScrollbarSx = (theme: Theme) => ({
  scrollbarWidth: 'thin',
  scrollbarColor: 'transparent transparent',
  '&::-webkit-scrollbar': {
    width: 5,
    height: 5,
  },
  '&::-webkit-scrollbar-button': {
    width: '0 !important',
    height: '0 !important',
    display: 'none !important',
    background: 'transparent',
  },
  '&::-webkit-scrollbar-button:single-button': {
    width: '0 !important',
    height: '0 !important',
    display: 'none !important',
    background: 'transparent',
  },
  '&::-webkit-scrollbar-button:vertical:start:decrement, &::-webkit-scrollbar-button:vertical:end:increment':
    {
      width: '0 !important',
      height: '0 !important',
      display: 'none !important',
      background: 'transparent',
    },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  '&:hover': {
    scrollbarColor: `${resolveHoverThumbColor(theme)} transparent`,
  },
  '&:hover::-webkit-scrollbar-thumb': {
    backgroundColor: resolveHoverThumbColor(theme),
  },
})
