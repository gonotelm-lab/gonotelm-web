import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { PasswordForm } from '../auth/PasswordForm'
import { useMeQuery } from '../auth/useMeQuery'
import { workspaceDialogLayout } from '../notebook-workspace/shared/ui/dialogLayoutTokens'
import { workspaceSpace } from '../notebook-workspace/shared/ui/layoutTokens'

/**
 * 把 `/user/me` 的 `login_source` 翻成可读文案。
 *
 * 后端取值（`entity.UserSession.LoginSource`）：`password` = 邮箱口令登录、
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

function ReadonlyRow({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <Stack direction="row" spacing={workspaceSpace.md} sx={{ alignItems: 'baseline' }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 88 }}>
        {label}
      </Typography>
      <Typography variant="body2" data-testid={testId}>
        {value}
      </Typography>
    </Stack>
  )
}

/**
 * 「账号安全」设置分区：登录方式 + 设置/修改登录口令。
 *
 * 口令是否已存在由 `/user/me` 的 `has_password` 决定；登录方式读 `login_source`
 * （两者都是 users_v2 改造新增的 P0 字段）。
 */
export function PasswordSettingsSection() {
  const { t } = useTranslation(['settings', 'auth'])
  const meQuery = useMeQuery()
  const hasPassword = meQuery.data?.has_password === true

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

      <Stack spacing={workspaceSpace.sm}>
        <ReadonlyRow
          label={t('settings:security.loginSourceLabel')}
          value={loginSourceLabel(meQuery.data?.login_source, t)}
          testId="security-login-source"
        />
        <ReadonlyRow
          label={t('settings:security.passwordStateLabel')}
          value={
            hasPassword ? t('settings:security.passwordSet') : t('settings:security.passwordNotSet')
          }
          testId="security-password-state"
        />
      </Stack>

      <PasswordForm hasPassword={hasPassword} testIdPrefix="settings-password" />
    </Stack>
  )
}
