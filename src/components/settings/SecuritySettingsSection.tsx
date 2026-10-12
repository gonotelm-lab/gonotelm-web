import { useState, type ReactNode } from 'react'
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined'
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import MailOutlineOutlinedIcon from '@mui/icons-material/MailOutlineOutlined'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { buildReloginPath } from '../../lib/auth'
import { PasswordForm } from '../auth/PasswordForm'
import { useMeQuery } from '../auth/useMeQuery'
import { ThirdPartyAccountsBlock } from './ThirdPartyAccountsBlock'
import { workspaceDialogLayout } from '../notebook-workspace/shared/ui/dialogLayoutTokens'
import { workspaceRadius, workspaceSpace } from '../notebook-workspace/shared/ui/layoutTokens'
import { workspaceIconSize } from '../notebook-workspace/shared/ui/typeTokens'

/**
 * 把 `/user/me` 的 `login_source` 翻成可读文案。
 *
 * 后端取值（`entity.UserSession.LoginSource`）：`password` = 邮箱密码登录、
 * `email` = 邮箱验证建号、其余是 provider 名；空串（旧会话）显示占位符。
 */
function loginSourceLabel(source: string | undefined, t: TFunction): string {
  if (!source) {
    return '—'
  }
  if (source === 'password') {
    return t('settings:security.loginSourcePassword')
  }
  if (source === 'email') {
    return t('settings:security.loginSourceEmail')
  }
  const known = t(`auth:provider.${source}`)
  return known === `auth:provider.${source}` ? source : known
}

/** 左图标 + 标签，右侧值：账号安全区的只读信息行。 */
function SecurityRow({
  icon,
  label,
  value,
  testId,
}: {
  icon: ReactNode
  label: string
  value: string
  testId: string
}) {
  return (
    <Stack
      direction="row"
      spacing={workspaceSpace.md}
      sx={{ alignItems: 'center', px: workspaceSpace.md, py: workspaceSpace.sm, minHeight: 44 }}
    >
      <Box sx={{ display: 'flex', color: 'text.secondary' }}>{icon}</Box>
      <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" data-testid={testId} sx={{ fontWeight: 500 }}>
        {value}
      </Typography>
    </Stack>
  )
}

/**
 * 「账号安全」设置分区：账号概览（邮箱 / 登录方式 / 密码状态）+ 密码动作 + 第三方账号状态。
 *
 * 密码表单不常驻页面：点按钮后在独立对话框里改（与设置弹窗的其它分区保持一致的
 * 「概览 + 动作」节奏）。`/set-password` 引导页仍然用同一套 `PasswordForm` 内联渲染。
 */
export function SecuritySettingsSection() {
  const { t } = useTranslation(['settings', 'auth'])
  const meQuery = useMeQuery()
  const hasPassword = meQuery.data?.has_password === true
  // 账号邮箱只读展示；后端旧构建不返回该字段时该行不渲染。
  const email = meQuery.data?.email?.trim() || undefined

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  const openDialog = () => {
    setJustSaved(false)
    setIsDialogOpen(true)
  }

  return (
    <Stack spacing={workspaceDialogLayout.sectionStackSpacing}>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {t('settings:security.title')}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: workspaceDialogLayout.helperTextMt }}
        >
          {hasPassword ? t('settings:security.changeSubtitle') : t('settings:security.subtitle')}
        </Typography>
      </Box>

      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: workspaceRadius.md,
          overflow: 'hidden',
        }}
      >
        {email ? (
          <>
            <SecurityRow
              icon={<MailOutlineOutlinedIcon sx={{ fontSize: workspaceIconSize.md }} />}
              label={t('settings:security.emailLabel')}
              value={email}
              testId="security-email"
            />
            <Divider />
          </>
        ) : null}
        <SecurityRow
          icon={<KeyOutlinedIcon sx={{ fontSize: workspaceIconSize.md }} />}
          label={t('settings:security.loginSourceLabel')}
          value={loginSourceLabel(meQuery.data?.login_source, t)}
          testId="security-login-source"
        />
        <Divider />
        <SecurityRow
          icon={
            hasPassword ? (
              <LockOutlinedIcon sx={{ fontSize: workspaceIconSize.md }} />
            ) : (
              <LockOpenOutlinedIcon sx={{ fontSize: workspaceIconSize.md }} />
            )
          }
          label={t('settings:security.passwordStateLabel')}
          value={
            hasPassword ? t('settings:security.passwordSet') : t('settings:security.passwordNotSet')
          }
          testId="security-password-state"
        />
      </Box>

      <Stack direction="row" spacing={workspaceDialogLayout.actionsGap} sx={{ alignItems: 'center' }}>
        <Button
          data-testid="security-password-open"
          variant="outlined"
          size="small"
          onClick={openDialog}
        >
          {hasPassword ? t('settings:security.changePassword') : t('settings:security.setPassword')}
        </Button>
        {justSaved ? (
          <Typography
            data-testid="security-password-saved"
            role="status"
            variant="caption"
            color="success.main"
          >
            {t('settings:security.saved')}
          </Typography>
        ) : null}
      </Stack>

      <ThirdPartyAccountsBlock />

      <Dialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: workspaceDialogLayout.paperRadius } } }}
      >
        <DialogTitle sx={{ pb: workspaceDialogLayout.titlePaddingBottom }}>
          {hasPassword ? t('settings:security.changePassword') : t('settings:security.setPassword')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: workspaceSpace.lg }}>
            {hasPassword ? t('settings:security.changeSubtitle') : t('settings:security.subtitle')}
          </Typography>
          <PasswordForm
            hasPassword={hasPassword}
            testIdPrefix="settings-password"
            onSaved={(result) => {
              setIsDialogOpen(false)
              if (result?.relogin_required) {
                // 会话已被后端作废：整页回登录页并带上说明。必须真导航——留在原地
                // 只会让后续每个请求陆续 2002。
                const back = `${window.location.pathname}${window.location.search}`
                window.location.assign(buildReloginPath(back))
                return
              }
              setJustSaved(true)
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: workspaceDialogLayout.contentPaddingX, pb: workspaceSpace.md }}>
          <Button
            data-testid="security-password-cancel"
            onClick={() => setIsDialogOpen(false)}
            color="inherit"
          >
            {t('common:action.cancel')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
