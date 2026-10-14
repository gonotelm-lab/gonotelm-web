import { useMemo, useState, type FormEvent } from 'react'
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { confirmPasswordResetLink, requestPasswordReset } from '../api/auth'
import {
  AUTH_ERROR_CODE,
  RELOGIN_NOTICE_PASSWORD_RESET,
  buildLoginPath,
  buildReloginPath,
  extractResetPasswordToken,
  isAuthErrorCode,
  sanitizeReturnTo,
} from '../lib/auth'
import {
  PASSWORD_MIN_LENGTH,
  isValidEmail,
  isValidPassword,
  normalizeEmail,
  passwordByteLength,
} from '../lib/authValidation'
import type { PasswordResetConfirmResponse } from '../types/api'
import { AuthShell } from '../components/auth/AuthShell'
import { ME_QUERY_KEY } from '../components/auth/useMeQuery'
import { NewPasswordFields } from '../components/auth/NewPasswordFields'
import { useResetPasswordPolicy } from '../components/auth/usePasswordPolicy'
import { authSubmitButtonSx, textLinkSx } from '../components/auth/authStyles'
import { workspaceSpace } from '../components/notebook-workspace/shared/ui/layoutTokens'

/**
 * 找回密码页的两种形态：
 * - `request`：输入邮箱发起找回（默认落点，没有链接 token 时）；
 * - `link`：邮件链接带 `#token=` 进来，设置新密码。
 *
 * 没有验证码形态：后端 `POST /auth/password/reset/verify/code` 与邮件里的验证码都已下线，
 * 重置只认一次性链接 token（注册那套 code 验证不在这里复用）。
 */
type ResetMode = 'request' | 'link'

/** 发起找回的失败文案；账号不存在时后端也返回成功，所以这里没有「账号不存在」分支。 */
function describeRequestError(error: unknown, t: TFunction): string {
  if (isAuthErrorCode(error, AUTH_ERROR_CODE.mailSendFailed)) {
    return t('reset.mailFailed')
  }
  if (isAuthErrorCode(error, AUTH_ERROR_CODE.tooManyRequests)) {
    return t('login.tooManyRequests')
  }
  if (isAuthErrorCode(error, AUTH_ERROR_CODE.emailInvalid)) {
    return t('signup.emailInvalid')
  }
  return t('reset.requestFailed')
}

/** 链接确认的失败文案：106016 覆盖「过期 / 已被用过 / 不存在」三种情况（后端同一个码）。 */
function describeConfirmError(
  error: unknown,
  t: TFunction,
  requireComplexPassword: boolean,
): string {
  if (isAuthErrorCode(error, AUTH_ERROR_CODE.verificationExpired)) {
    return t('reset.expired')
  }
  if (isAuthErrorCode(error, AUTH_ERROR_CODE.weakPassword)) {
    return requireComplexPassword
      ? t('password.weakPasswordComplex', { min: PASSWORD_MIN_LENGTH })
      : t('password.weakPassword', { min: PASSWORD_MIN_LENGTH })
  }
  if (isAuthErrorCode(error, AUTH_ERROR_CODE.tooManyRequests)) {
    return t('login.tooManyRequests')
  }
  return t('reset.confirmFailed')
}

/**
 * 找回密码页（公开路由，`/reset-password`，与后端 `conf.Auth.PasswordResetURLBase` 对齐）。
 *
 * 为什么是公开的：邮件链接可能在未登录的浏览器里打开，而用户**正是因为登不进来**才走这条路。
 *
 * 防账号枚举（与后端一致）：发起接口对不存在的邮箱同样返回 204，因此成功态文案必须是
 * 「如果该邮箱已注册……」，不能出现「该邮箱未注册」之类的判断。
 *
 * 重设成功即 `relogin_required`：后端作废该账号全部会话，所以收尾统一回登录页重新登录，
 * 而不是回 return_to —— 那会停在一个已经失效的会话上。
 */
export function ResetPasswordPage() {
  const { t } = useTranslation('auth')
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  // 进页面第一件事：拿服务端密码策略（GET /auth/prefetch，与注册页共用的那份）。
  // 策略没回来之前不渲染口令表单，免得用户按宽松规则填完再被后端 106014 打回。
  const { requireComplexPassword, isPending: policyPending } = useResetPasswordPolicy()

  const returnTo = sanitizeReturnTo(searchParams.get('return_to'))

  // token 只从 URL 片段/查询串读一次：确认过程中不再重新读取，避免点完按钮又被烧一次。
  const token = useMemo(
    () =>
      extractResetPasswordToken(
        typeof window === 'undefined' ? '' : window.location.hash,
        typeof window === 'undefined' ? '' : window.location.search,
      ),
    [],
  )

  const [mode, setMode] = useState<ResetMode>(token ? 'link' : 'request')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [touched, setTouched] = useState(false)
  const [sent, setSent] = useState(false)

  /**
   * 重设成功后的收尾。
   *
   * 后端确认接口恒返回 `relogin_required: true`（作废该账号全部会话），但字段既然有就照它走：
   * - true：不许留旧的成功数据（否则登录页会拿它把用户又弹回受保护页面），清掉 me 缓存后回登录页；
   * - false：会话还在（例如服务端作废失败），留在应用里，只让 me 重新取一次。
   */
  const finishReset = async (result: PasswordResetConfirmResponse) => {
    if (result?.relogin_required === false) {
      await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY })
      navigate(returnTo, { replace: true })
      return
    }
    queryClient.removeQueries({ queryKey: ME_QUERY_KEY })
    navigate(buildReloginPath(returnTo, RELOGIN_NOTICE_PASSWORD_RESET), { replace: true })
  }

  const requestMutation = useMutation({
    mutationFn: requestPasswordReset,
    onSuccess: () => setSent(true),
  })

  const linkMutation = useMutation({
    mutationFn: confirmPasswordResetLink,
    onSuccess: finishReset,
  })

  const normalizedEmail = normalizeEmail(email)
  const emailInvalid = touched && !isValidEmail(email)
  const pending = requestMutation.isPending || linkMutation.isPending
  // 校验只决定「要不要发请求」，不再决定按钮能不能点：点了才把错误亮出来。
  const newPasswordValid = isValidPassword(password, requireComplexPassword) && confirm === password
  // 发起模式没有口令字段，不必等策略；链接模式要等，否则会先按错规则放行。
  const waitingForPolicy = policyPending && mode === 'link'

  const handleRequestSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTouched(true)
    if (requestMutation.isPending || !isValidEmail(email)) {
      return
    }
    setSent(false)
    requestMutation.mutate({ email: normalizedEmail })
  }

  const handleLinkSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTouched(true)
    if (linkMutation.isPending || !token || !newPasswordValid) {
      return
    }
    linkMutation.mutate({ token, new_password: password })
  }

  /**
   * 链接失效时唯一的出路就是重发。
   *
   * 邮件链接不带邮箱，拿不到收件地址就发不出去，所以这里先回到发起表单让用户填地址，
   * 再由那个表单的提交按钮真正发信（按钮文案与动作保持一致）。
   */
  const handleResend = () => {
    setSent(false)
    setMode('request')
  }

  const title = mode === 'request' ? t('reset.requestTitle') : t('reset.newPasswordTitle')
  // 链接模式不写副标题：标题「设置新密码」已经说完了，再解释「重置后各设备会退出」纯属噪音
  const subtitle = mode === 'request' ? t('reset.requestSubtitle') : undefined

  const newPasswordFields = (
    <NewPasswordFields
      password={password}
      confirm={confirm}
      onPasswordChange={setPassword}
      onConfirmChange={setConfirm}
      requireComplex={requireComplexPassword}
      showErrors={touched || passwordByteLength(password) > 0}
      disabled={pending}
      testIdPrefix="reset-password"
      autoFocus
    />
  )

  return (
    <AuthShell title={title} subtitle={subtitle} busy={pending || waitingForPolicy} showLegal={false}>
      {waitingForPolicy ? (
        <Stack
          data-testid="reset-policy-loading"
          direction="row"
          spacing={workspaceSpace.sm}
          aria-live="polite"
          sx={{ minHeight: 44, alignItems: 'center' }}
        >
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            {t('reset.policyLoading')}
          </Typography>
        </Stack>
      ) : mode === 'request' ? (
        <Box component="form" noValidate onSubmit={handleRequestSubmit} sx={{ width: '100%' }}>
          <Stack spacing={workspaceSpace.md}>
            <TextField
              fullWidth
              size="small"
              type="email"
              name="email"
              autoComplete="email"
              label={t('reset.emailLabel')}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={pending}
              error={emailInvalid}
              helperText={emailInvalid ? t('signup.emailInvalid') : undefined}
              slotProps={{ htmlInput: { 'data-testid': 'reset-email-input' } }}
            />

            {requestMutation.isError ? (
              <Alert data-testid="reset-request-error" severity="error" sx={{ textAlign: 'left' }}>
                {describeRequestError(requestMutation.error, t)}
              </Alert>
            ) : null}

            {sent ? (
              <Alert data-testid="reset-request-sent" severity="success" sx={{ textAlign: 'left' }}>
                {t('reset.sent')}
              </Alert>
            ) : null}

            <Button
              data-testid="reset-request-submit"
              type="submit"
              variant="contained"
              fullWidth
              disabled={pending}
              sx={authSubmitButtonSx}
            >
              {requestMutation.isPending ? t('reset.sending') : t('reset.sendSubmit')}
            </Button>
          </Stack>
        </Box>
      ) : (
        <Box component="form" noValidate onSubmit={handleLinkSubmit} sx={{ width: '100%' }}>
          <Stack spacing={workspaceSpace.md}>
            {newPasswordFields}

            {linkMutation.isError ? (
              <Alert data-testid="reset-error" severity="error" sx={{ textAlign: 'left' }}>
                {describeConfirmError(linkMutation.error, t, requireComplexPassword)}
              </Alert>
            ) : null}

            <Button
              data-testid="reset-submit"
              type="submit"
              variant="contained"
              fullWidth
              disabled={pending}
              sx={authSubmitButtonSx}
            >
              {linkMutation.isPending ? t('reset.submitting') : t('reset.submit')}
            </Button>

            <Button
              data-testid="reset-resend"
              variant="text"
              disabled={pending}
              onClick={handleResend}
              sx={textLinkSx}
            >
              {t('reset.resend')}
            </Button>
          </Stack>
        </Box>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', gap: '6px' }}>
        <Box
          component={Link}
          to={buildLoginPath(returnTo)}
          data-testid="reset-login-link"
          sx={textLinkSx}
        >
          {t('reset.backToLogin')}
        </Box>
      </Typography>
    </AuthShell>
  )
}
