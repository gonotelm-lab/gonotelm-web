import type { SxProps, Theme } from '@mui/material/styles'

/**
 * Card-less auth column (reference: brand mark → title → form stack → legal row).
 * No panel background: the controls themselves are the only raised surfaces.
 * Shared by every auth page so 登录 / 注册 / 验证 / 设置密码 keep one column width.
 */
export const authColumnMaxWidth = 400

export const authFocusRing = {
  '&:focus-visible': {
    outline: '2px solid',
    outlineColor: 'primary.main',
    outlineOffset: 2,
  },
} satisfies SxProps<Theme>

/** Third-party buttons share one spec: 44px tall, hairline outline, centered icon + label. */
export const providerButtonSx: SxProps<Theme> = {
  minHeight: 44,
  whiteSpace: 'nowrap',
  // Paper fill so the button reads as a surface now that the card is gone.
  bgcolor: 'background.paper',
  // MUI default is 8px; the reference sits the mark a touch further from the label.
  '& .MuiButton-startIcon': { mr: '10px' },
  ...authFocusRing,
}

/** Primary submit keeps the same 44px rhythm as the provider buttons. */
export const authSubmitButtonSx: SxProps<Theme> = {
  minHeight: 44,
  ...authFocusRing,
}

/** Inline text links stay quiet until hovered — underline is the only affordance. */
export const textLinkSx: SxProps<Theme> = {
  color: 'inherit',
  textDecoration: 'underline',
  textDecorationColor: 'var(--color-rule-2)',
  textUnderlineOffset: '3px',
  transition: [
    `color var(--dur-short) var(--ease-out)`,
    `text-decoration-color var(--dur-short) var(--ease-out)`,
  ].join(', '),
  '&:hover': {
    color: 'primary.main',
    textDecorationColor: 'currentColor',
  },
  ...authFocusRing,
}
