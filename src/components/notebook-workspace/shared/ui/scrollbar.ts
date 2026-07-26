import type { Theme } from '@mui/material/styles'

const defaultHoverThumbColor = 'rgba(21, 42, 74, 0.18)'
const scrollbarSizePx = 5

const resolveHoverThumbColor = (theme: Theme) => {
  const scrollbar = theme.workspacePalette?.scrollbar
  if (!scrollbar) {
    return defaultHoverThumbColor
  }
  return `rgba(${scrollbar.hoverThumbRgb}, ${scrollbar.hoverThumbOpacity})`
}

export type SubtleScrollbarOptions = {
  /**
   * Nested scroll target relative to the sx host, e.g. `'& textarea'`.
   * Defaults to the host element itself.
   */
  within?: string
}

/**
 * Shared workspace scrollbar: thin, transparent until hover.
 * Apply on every overflow:auto/scroll container for visual consistency.
 */
export const subtleScrollbarSx = (theme: Theme, options?: SubtleScrollbarOptions) => {
  const within = options?.within
  const thumb = resolveHoverThumbColor(theme)
  const target = within ?? '&'
  const hover = within ? `${within}:hover` : '&:hover'
  const webkit = (pseudo: string) => `${target}${pseudo}`

  return {
    ...(within
      ? {
          [within]: {
            scrollbarWidth: 'thin' as const,
            scrollbarColor: 'transparent transparent',
          },
        }
      : {
          scrollbarWidth: 'thin' as const,
          scrollbarColor: 'transparent transparent',
        }),
    [webkit('::-webkit-scrollbar')]: {
      width: scrollbarSizePx,
      height: scrollbarSizePx,
    },
    [webkit('::-webkit-scrollbar-button')]: {
      width: '0 !important',
      height: '0 !important',
      display: 'none !important',
      background: 'transparent',
    },
    [webkit('::-webkit-scrollbar-button:single-button')]: {
      width: '0 !important',
      height: '0 !important',
      display: 'none !important',
      background: 'transparent',
    },
    [webkit(
      '::-webkit-scrollbar-button:vertical:start:decrement, ' +
        `${target}::-webkit-scrollbar-button:vertical:end:increment`,
    )]: {
      width: '0 !important',
      height: '0 !important',
      display: 'none !important',
      background: 'transparent',
    },
    [webkit('::-webkit-scrollbar-track')]: {
      background: 'transparent',
    },
    [webkit('::-webkit-scrollbar-thumb')]: {
      borderRadius: 999,
      backgroundColor: 'transparent',
    },
    [hover]: {
      scrollbarColor: `${thumb} transparent`,
    },
    [`${hover}::-webkit-scrollbar-thumb`]: {
      backgroundColor: thumb,
    },
  }
}
