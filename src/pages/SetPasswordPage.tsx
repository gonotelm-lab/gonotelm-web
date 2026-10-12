import { Box, CircularProgress } from '@mui/material'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { buildReloginPath, sanitizeReturnTo } from '../lib/auth'
import { AuthShell } from '../components/auth/AuthShell'
import { PasswordForm } from '../components/auth/PasswordForm'
import { useMeQuery } from '../components/auth/useMeQuery'

/**
 * 设置/修改密码页（受 AuthGate 保护）。
 *
 * 主要用途是「注册票据不匹配」的补救路径：跨设备/换浏览器验证时后端不写密码，
 * 前端把已登录用户引导到这里，由已认证会话通过 `PUT /auth/password` 补上。
 *
 * 保存成功即 `relogin_required`：后端作废了全部会话（含当前），所以这里不是
 * 「回到 return_to」而是「去登录页重新登录」，并带上说明。
 */
export function SetPasswordPage() {
  const { t } = useTranslation('auth')
  const [searchParams] = useSearchParams()
  const returnTo = sanitizeReturnTo(searchParams.get('return_to'))
  const navigate = useNavigate()
  const meQuery = useMeQuery()

  if (meQuery.isPending) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: 'background.default' }}>
        <CircularProgress size={24} />
      </Box>
    )
  }

  const hasPassword = meQuery.data?.has_password === true

  return (
    <AuthShell
      title={hasPassword ? t('password.changeTitle') : t('password.setTitle')}
      subtitle={hasPassword ? t('password.changeSubtitle') : t('password.setSubtitle')}
      showLegal={false}
    >
      <PasswordForm
        hasPassword={hasPassword}
        testIdPrefix="set-password"
        onSaved={() => navigate(buildReloginPath(returnTo), { replace: true })}
        onSkip={() => navigate(returnTo, { replace: true })}
      />
    </AuthShell>
  )
}
