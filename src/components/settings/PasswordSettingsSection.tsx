import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { PasswordForm } from '../auth/PasswordForm'
import { useMeQuery } from '../auth/useMeQuery'
import { workspaceDialogLayout } from '../notebook-workspace/shared/ui/dialogLayoutTokens'

/**
 * 「账号安全」设置分区：设置或修改登录口令。
 *
 * 口令是否已存在由 `/user/me` 的 `has_password` 决定（字段缺失时按「未知」处理，
 * 保守地不要求当前口令——后端没有该字段时口令接口也还不存在）。
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

      <PasswordForm hasPassword={hasPassword} testIdPrefix="settings-password" />
    </Stack>
  )
}
