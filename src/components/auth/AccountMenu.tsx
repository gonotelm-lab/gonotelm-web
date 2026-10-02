import { useState, type MouseEvent } from 'react'
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined'
import { IconButton, Menu, MenuItem, Typography } from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { logout } from '../../api/auth'
import { subtleScrollbarSx } from '../notebook-workspace/shared/ui/scrollbar'
import { useMeQuery } from './useMeQuery'

export function AccountMenu() {
  const { t } = useTranslation('auth')
  const queryClient = useQueryClient()
  const { data } = useMeQuery()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutFailed, setLogoutFailed] = useState(false)

  const nickname = data?.nickname ?? data?.user_id ?? ''

  const handleOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    if (!isLoggingOut) {
      setAnchorEl(null)
    }
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
      >
        <AccountCircleOutlinedIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        slotProps={{
          paper: {
            sx: (theme) => ({
              minWidth: 220,
              maxWidth: 280,
              // MUI 默认 calc(100% - 96px) 预留上下各 48px，矮窗口里会把两行菜单也压成滚动区。
              // 16px 是 Popover 的 marginThreshold，两侧各留 16px 已经够点外面关闭了。
              maxHeight: 'calc(100vh - 32px)',
              ...subtleScrollbarSx(theme),
            }),
          },
        }}
      >
        <MenuItem disabled sx={{ opacity: 1 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            // MenuItem 默认 white-space: nowrap：昵称过长会把菜单撑到满宽再被硬裁掉，改成省略号。
            noWrap
            title={nickname}
            sx={{ minWidth: 0 }}
          >
            <span data-testid="account-nickname">{nickname}</span>
          </Typography>
        </MenuItem>
        <MenuItem
          data-testid="account-logout"
          disabled={isLoggingOut}
          onClick={() => void handleLogout()}
        >
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
    </>
  )
}
