import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import { Box, Button, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import type { TFunction } from 'i18next'
import {
  AUTH_ERROR_CODE,
  UNAUTHORIZED_CODE,
  buildLoginPath,
  parseAuthCallbackError,
  recallAuthReturn,
  type AuthCallbackMode,
} from '../lib/auth'
import { AuthShell } from '../components/auth/AuthShell'
import { authFocusRing, authSubmitButtonSx } from '../components/auth/authStyles'
import { workspaceSpace } from '../components/notebook-workspace/shared/ui/layoutTokens'

/**
 * 回调失败的文案：绑定与登录是两套语义，同一个 code 在两边的说法不同。
 *
 * 这里只按业务码取文案，绝不回显后端 `msg`——那是内部信息，而且顶层导航下
 * 用户只会看到一页 JSON（这正是本页存在的原因）。
 */
function describeCallbackError(
  code: number | undefined,
  mode: AuthCallbackMode,
  t: TFunction,
): string {
  const isBind = mode === 'bind'

  switch (code) {
    case AUTH_ERROR_CODE.identityAlreadyLinked:
      return t('callbackError.identityAlreadyLinked')
    case AUTH_ERROR_CODE.providerAlreadyBound:
      return t('callbackError.providerAlreadyBound')
    case AUTH_ERROR_CODE.emailNotVerified:
      return t('callbackError.emailNotVerified')
    case AUTH_ERROR_CODE.userBanned:
      return t('callbackError.userBanned')
    case AUTH_ERROR_CODE.idpEmailUnavailable:
      return t('callbackError.idpEmailUnavailable')
    case AUTH_ERROR_CODE.loginStateNotFound:
    case AUTH_ERROR_CODE.loginStateMismatch:
    case UNAUTHORIZED_CODE:
      return isBind ? t('callbackError.bindSessionExpired') : t('callbackError.sessionExpired')
    case AUTH_ERROR_CODE.idpError:
    case AUTH_ERROR_CODE.idpExchangeError:
      return isBind ? t('callbackError.bindIdpFailed') : t('callbackError.idpFailed')
    default:
      return isBind ? t('callbackError.bindFailed') : t('callbackError.loginFailed')
  }
}

/**
 * 第三方回调失败的落地页（公开路由，不查 `/user/me`）。
 *
 * 回调是顶层导航：后端返回 JSON 时浏览器只会原样显示那段 JSON。后端改成
 * 302 到这里之后，失败也能用站内的样子说清楚，并给出「回去 / 重试」的出口。
 *
 * 契约见 `lib/auth.ts` 的 `AUTH_ERROR_PATH`：`?error=<code>&mode=<login|bind>&return_to=`。
 */
export function AuthErrorPage() {
  const { t } = useTranslation('auth')
  const [searchParams] = useSearchParams()
  const { code, mode, returnTo } = parseAuthCallbackError(searchParams.toString())
  const isBind = mode === 'bind'
  // 后端能带 return_to 就用它的；带不了（state 已过期/换浏览器，最常见的那类）
  // 就退回「跳 IdP 之前前端自己记下的位置」。
  const backTo = searchParams.get('return_to') ? returnTo : (recallAuthReturn() ?? returnTo)

  const title = isBind ? t('callbackError.bindTitle') : t('callbackError.loginTitle')
  const message = describeCallbackError(code, mode, t)

  return (
    <AuthShell title={title} subtitle={message} showLegal={false}>
      <Stack spacing={workspaceSpace.lg} sx={{ width: '100%', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', color: 'text.secondary' }}>
          <ErrorOutlineRoundedIcon sx={{ fontSize: 40 }} />
        </Box>

        <Stack
          direction="row"
          spacing={workspaceSpace.md}
          sx={{ width: '100%', justifyContent: 'center' }}
        >
          <Button
            component={Link}
            to={backTo}
            data-testid="auth-error-back"
            variant="outlined"
            sx={{ minHeight: 44, ...authFocusRing }}
          >
            {isBind ? t('callbackError.backToApp') : t('callbackError.backHome')}
          </Button>
          {isBind ? null : (
            <Button
              component={Link}
              to={buildLoginPath(backTo)}
              data-testid="auth-error-retry-login"
              variant="contained"
              sx={authSubmitButtonSx}
            >
              {t('callbackError.retryLogin')}
            </Button>
          )}
        </Stack>

        {code === undefined ? null : (
          <Typography
            data-testid="auth-error-code"
            variant="caption"
            color="text.secondary"
            sx={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {t('callbackError.codeLabel', { code })}
          </Typography>
        )}
      </Stack>
    </AuthShell>
  )
}
