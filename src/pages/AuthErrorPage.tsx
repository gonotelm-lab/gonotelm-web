import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import { Box, Button, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { appendCallbackFailure, parseCallbackFailure, recallAuthAttempt } from '../lib/auth'
import { SETTINGS_SEARCH_PARAM } from '../components/settings/useSettingsDialogRoute'
import { AuthShell } from '../components/auth/AuthShell'
import { describeCallbackFailure } from '../components/auth/callbackFailureText'
import { authFocusRing } from '../components/auth/authStyles'
import { workspaceSpace } from '../components/notebook-workspace/shared/ui/layoutTokens'

/**
 * **绑定失败**的落地页（公开路由，不查 `/user/me`）。
 *
 * 后端把回调失败也做成 302（回调是顶层导航，返回 JSON 会被原样渲染成页面）：
 *
 *   GET /auth/error?reason=<kebab>&provider=<github|google|…>
 *
 * 登录失败落在 `/login`（同样带 reason/provider），所以「哪套文案」由**路径**决定，
 * 不靠参数猜。`reason` 的取值见 `lib/auth.ts` 的 `CALLBACK_REASON`。
 *
 * 「返回设置」优先用跳 IdP 前记住的位置（`recallAuthAttempt`）——后端在
 * 「state 已过期」这类最常见失败下拿不到 return_to，只能靠前端自己记。
 */
export function AuthErrorPage() {
  const { t } = useTranslation('auth')
  const [searchParams] = useSearchParams()
  const failure = parseCallbackFailure(searchParams.toString())
  const reason = failure?.reason ?? ''
  const provider = failure?.provider ?? ''
  // 回到「那一页 + 设置已打开 + 账号安全」——绑定就是从那里发起的。
  const remembered = recallAuthAttempt()?.returnTo ?? '/'
  // 顺手把原因带过去：设置对话框会就地显示这条错误，用户不用记住上一页说了什么。
  const backTo =
    failure && remembered.includes(`${SETTINGS_SEARCH_PARAM}=`)
      ? appendCallbackFailure(remembered, failure)
      : remembered

  return (
    <AuthShell
      title={t('callbackReason.bindTitle')}
      subtitle={describeCallbackFailure(reason, provider, 'bind', t)}
      showLegal={false}
    >
      <Stack spacing={workspaceSpace.lg} sx={{ width: '100%', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', color: 'text.secondary' }}>
          <ErrorOutlineRoundedIcon sx={{ fontSize: 40 }} />
        </Box>

        <Button
          component={Link}
          to={backTo}
          data-testid="auth-error-back"
          variant="outlined"
          sx={{ minHeight: 44, ...authFocusRing }}
        >
          {t('callbackReason.backToApp')}
        </Button>

        {failure ? (
          <Typography
            data-testid="auth-error-reason"
            variant="caption"
            color="text.secondary"
            sx={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {t('callbackReason.reasonLabel', {
              reason,
              provider: provider || t('callbackReason.providerFallback'),
            })}
          </Typography>
        ) : null}
      </Stack>
    </AuthShell>
  )
}
