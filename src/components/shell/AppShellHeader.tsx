import { NavLink } from 'react-router-dom'
import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { AccountMenu } from '../auth/AccountMenu'
import { BrandMark } from '../brand/BrandMark'
import { workspaceSpace } from '../notebook-workspace/shared/ui/layoutTokens'

/** 首页 / 收藏页共用的顶栏尺寸，与原先 HomePage chrome 对齐。 */
export const appShellHeaderChrome = {
  rowMinHeight: 48,
  controlHeight: 36,
  avatarSize: 32,
} as const

/**
 * Logo + [首页][收藏] + AccountMenu。
 * 收藏相关页与首页共用，保证导航与 URL 一致。
 */
export function AppShellHeader() {
  const { t } = useTranslation('favourites')

  return (
    <Stack
      direction="row"
      sx={{
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: appShellHeaderChrome.rowMinHeight,
      }}
    >
      <Stack direction="row" spacing={workspaceSpace.md} sx={{ alignItems: 'center' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <BrandMark />
          <Typography variant="h6">GoNoteLM</Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }} component="nav">
          <HeaderNavLink to="/" end label={t('nav.home')} />
          <HeaderNavLink to="/favourites" label={t('nav.favourites')} />
        </Stack>
      </Stack>
      <AccountMenu
        triggerSize={appShellHeaderChrome.controlHeight}
        avatarSize={appShellHeaderChrome.avatarSize}
      />
    </Stack>
  )
}

function HeaderNavLink({
  to,
  label,
  end,
}: {
  to: string
  label: string
  end?: boolean
}) {
  return (
    <Box
      component={NavLink}
      to={to}
      end={end}
      sx={(theme) => ({
        px: workspaceSpace.sm,
        py: 0.5,
        borderRadius: 1,
        textDecoration: 'none',
        color: 'text.secondary',
        typography: 'body2',
        fontWeight: 500,
        '&.active': {
          color: 'text.primary',
          bgcolor: theme.palette.action.selected,
        },
        '&:hover': {
          bgcolor: theme.palette.action.hover,
        },
      })}
    >
      {label}
    </Box>
  )
}
