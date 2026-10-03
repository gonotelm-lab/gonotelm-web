import { useState, type MouseEvent } from 'react'
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import { Avatar, IconButton, Menu, MenuItem, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { logout } from '../../api/auth'
import { SettingsDialog } from '../settings/SettingsDialog'
import { workspaceSpace } from '../notebook-workspace/shared/ui/layoutTokens'
import { subtleScrollbarSx } from '../notebook-workspace/shared/ui/scrollbar'
import { workspaceIconSize } from '../notebook-workspace/shared/ui/typeTokens'
import { useMeQuery } from './useMeQuery'

const menuItemSx = {
  gap: workspaceSpace.md,
  px: workspaceSpace.md,
} as const

const menuItemIconSx = {
  fontSize: workspaceIconSize.md,
  color: 'text.secondary',
} as const

interface AccountMenuProps {
  /** Trigger hit box in px. Omit to let MUI size the small IconButton itself. */
  triggerSize?: number
  /** Avatar diameter in px. */
  avatarSize?: number
  // Keeps the trigger aligned with the host header's other controls, e.g. the
  // workspace chrome (36px box / 32px avatar) vs. the roomier home header.
}

export function AccountMenu({ triggerSize, avatarSize = 28 }: AccountMenuProps) {
  const { t } = useTranslation(['auth', 'settings'])
  const queryClient = useQueryClient()
  const { data } = useMeQuery()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutFailed, setLogoutFailed] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const nickname = data?.nickname ?? data?.user_id ?? ''
  // 后端在用户未设置头像时返回空串；空串不交给 <img>，避免向当前页发起无效请求。
  const avatarUrl = data?.avatar_url?.trim() || undefined

  const handleOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    if (!isLoggingOut) {
      setAnchorEl(null)
    }
  }

  const handleOpenSettings = () => {
    setAnchorEl(null)
    setIsSettingsOpen(true)
  }

  const handleLogout = async () => {
    if (isLoggingOut) {
      return
    }
    setIsLoggingOut(true)
    setLogoutFailed(false)
    try {
      await logout()
      queryClient.clear()
      if (typeof window !== 'undefined') {
        window.location.assign('/login')
      }
    } catch {
      setIsLoggingOut(false)
      setLogoutFailed(true)
    }
  }

  return (
    <>
      <IconButton
        data-testid="account-trigger"
        size="small"
        aria-label={t('account.menuAria')}
        onClick={handleOpen}
        sx={triggerSize ? { width: triggerSize, height: triggerSize, p: 0 } : undefined}
      >
        {avatarUrl ? (
          <Avatar
            data-testid="account-trigger-avatar"
            src={avatarUrl}
            alt={nickname}
            sx={{ width: avatarSize, height: avatarSize }}
          />
        ) : (
          <AccountCircleOutlinedIcon fontSize="small" />
        )}
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        // 右对齐触发器，否则 MUI 默认 top-left 原点会让菜单相对头像左偏。
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        // 默认 elevation=8 是 Material 三段重投影，和全站的 hairline 语言冲突。
        elevation={0}
        slotProps={{
          paper: {
            sx: (theme) => ({
              minWidth: 160,
              maxWidth: 280,
              mt: workspaceSpace.xxs,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.06)}, 0 4px 14px ${alpha(theme.palette.common.black, 0.12)}`,
              // MUI 默认 calc(100% - 96px) 预留上下各 48px，矮窗口里会把两行菜单也压成滚动区。
              // 16px 是 Popover 的 marginThreshold，两侧各留 16px 已经够点外面关闭了。
              maxHeight: 'calc(100vh - 32px)',
              ...subtleScrollbarSx(theme),
            }),
          },
        }}
      >
        <MenuItem
          data-testid="account-settings"
          disabled={isLoggingOut}
          onClick={handleOpenSettings}
          sx={menuItemSx}
        >
          <SettingsOutlinedIcon sx={menuItemIconSx} />
          {t('settings:title')}
        </MenuItem>
        <MenuItem
          data-testid="account-logout"
          disabled={isLoggingOut}
          onClick={() => void handleLogout()}
          sx={menuItemSx}
        >
          <LogoutOutlinedIcon sx={menuItemIconSx} />
          {isLoggingOut ? t('account.loggingOut') : t('account.logout')}
        </MenuItem>
        {logoutFailed ? (
          <MenuItem disabled sx={{ opacity: 1 }}>
            <Typography data-testid="account-logout-error" variant="caption" color="error.main">
              {t('account.logoutFailed')}
            </Typography>
          </MenuItem>
        ) : null}
      </Menu>
      {isSettingsOpen ? (
        <SettingsDialog open onClose={() => setIsSettingsOpen(false)} />
      ) : null}
    </>
  )
}
