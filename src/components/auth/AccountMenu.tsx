import { useState, type MouseEvent } from 'react'
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import { Avatar, IconButton, Menu, MenuItem, Typography } from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { logout } from '../../api/auth'
import { SettingsDialog } from '../settings/SettingsDialog'
import { useSettingsDialogRoute } from '../settings/useSettingsDialogRoute'
import {
  headerMenuIconSx,
  headerMenuItemSx,
  headerMenuPaperSx,
} from '../notebook-workspace/shared/ui/menuStyles'
import { useMeQuery } from './useMeQuery'

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
  // 对话框的开/关与分区放在 URL（`?settings=<分区>`）里：第三方绑定的 return_to
  // 能带上它，绑完就能回到「这一页 + 设置已打开 + 原分区」。
  const settings = useSettingsDialogRoute()

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
    settings.openSettings()
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
        elevation={0}
        slotProps={{ paper: { sx: headerMenuPaperSx } }}
      >
        <MenuItem
          data-testid="account-settings"
          disabled={isLoggingOut}
          onClick={handleOpenSettings}
          sx={headerMenuItemSx}
        >
          <SettingsOutlinedIcon sx={headerMenuIconSx} />
          {t('settings:title')}
        </MenuItem>
        <MenuItem
          data-testid="account-logout"
          disabled={isLoggingOut}
          onClick={() => void handleLogout()}
          sx={headerMenuItemSx}
        >
          <LogoutOutlinedIcon sx={headerMenuIconSx} />
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
      {settings.isOpen ? (
        <SettingsDialog
          open
          onClose={settings.closeSettings}
          activeSection={settings.activeSection}
          onActiveSectionChange={settings.selectSection}
        />
      ) : null}
    </>
  )
}
