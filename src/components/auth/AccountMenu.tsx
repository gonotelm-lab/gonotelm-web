import { useState, type MouseEvent } from 'react'
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined'
import { IconButton, Menu, MenuItem, Typography } from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { logout } from '../../api/auth'
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
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        <MenuItem disabled sx={{ opacity: 1 }}>
          <Typography variant="body2" color="text.secondary">
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
