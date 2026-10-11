import { useState, type FormEvent } from 'react'
import { Alert, Box, Button, CircularProgress, Divider, Stack, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getAuthProviders, goToAuthLogin, passwordLogin } from '../api/auth'
import {
  AUTH_ERROR_CODE,
  RELOGIN_NOTICE_PASSWORD_CHANGED,
  buildBindErrorPath,
  buildSignupPath,
  isAuthErrorCode,
  parseCallbackFailure,
  recallAuthAttempt,
  sanitizeReturnTo,
} from '../lib/auth'
import { describeCallbackFailure } from '../components/auth/callbackFailureText'
import type { CallbackFailure } from '../lib/auth'
import { isValidEmail, normalizeEmail } from '../lib/authValidation'
import { ME_QUERY_KEY, useMeQuery } from '../components/auth/useMeQuery'
import { AuthShell } from '../components/auth/AuthShell'
import { ProviderIcon } from '../components/auth/ProviderIcon'
import { authSubmitButtonSx, providerButtonSx, textLinkSx } from '../components/auth/authStyles'
import { workspaceIconSize } from '../components/notebook-workspace/shared/ui/typeTokens'
import { workspaceSpace } from '../components/notebook-workspace/shared/ui/layoutTokens'

const providerGap = 1.5

function providerLabel(name: string, t: (key: string) => string): string {
  const known = t(`provider.${name}`)
  return known === `provider.${name}` ? name : known
}

/** 登录失败文案：账号不存在与口令错误共用统一文案，避免登录变成账号枚举器。 */
function describePasswordLoginError(error: unknown, t: (key: string) => string): string {
  if (isAuthErrorCode(error, AUTH_ERROR_CODE.invalidCredentials)) {
    return t('login.invalidCredentials')
  }
  if (isAuthErrorCode(error, AUTH_ERROR_CODE.userBanned)) {
    return t('login.banned')
  }
  if (isAuthErrorCode(error, AUTH_ERROR_CODE.tooManyRequests)) {
    return t('login.tooManyRequests')
  }
  return t('login.failed')
}

/** 邮箱 + 口令登录（POST /auth/login）；仅在后端开启口令登录时渲染。 */
function PasswordLoginForm({ returnTo }: { returnTo: string }) {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState(false)

  const loginMutation = useMutation({
    mutationFn: passwordLogin,
    onSuccess: async () => {
      // 口令登录成功即签发会话；让 me 查询失效，AuthGate 会在跳转后重新校验。
      await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY })
      navigate(returnTo, { replace: true })
    },
  })

  const normalizedEmail = normalizeEmail(email)
  const emailInvalid = touched && !isValidEmail(email)
  const passwordEmpty = touched && password.length === 0
  const canSubmit = isValidEmail(email) && password.length > 0 && !loginMutation.isPending

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTouched(true)
    if (!isValidEmail(email) || password.length === 0) {
      return
    }
    loginMutation.mutate({ email: normalizedEmail, password, login_from: 'web' })
  }

  return (
    <Box component="form" noValidate onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <Stack spacing={workspaceSpace.md}>
        <TextField
          fullWidth
          size="small"
          type="email"
          name="email"
          autoComplete="email"
          label={t('login.emailLabel')}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={loginMutation.isPending}
          error={emailInvalid}
          helperText={emailInvalid ? t('signup.emailInvalid') : undefined}
          slotProps={{ htmlInput: { 'data-testid': 'login-email-input' } }}
        />
        <TextField
          fullWidth
          size="small"
          type="password"
          name="password"
          autoComplete="current-password"
          label={t('login.passwordLabel')}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={loginMutation.isPending}
          error={passwordEmpty}
          slotProps={{ htmlInput: { 'data-testid': 'login-password-input' } }}
        />

        {loginMutation.isError ? (
          <Alert data-testid="login-password-error" severity="error" sx={{ textAlign: 'left' }}>
            {describePasswordLoginError(loginMutation.error, t)}
          </Alert>
        ) : null}

        <Button
          data-testid="login-password-submit"
          type="submit"
          variant="contained"
          fullWidth
          disabled={!canSubmit}
          sx={authSubmitButtonSx}
        >
          {loginMutation.isPending ? t('login.submitting') : t('login.submit')}
        </Button>
      </Stack>
    </Box>
  )
}

interface CallbackLanding {
  /** 绑定失败且前端知道这次是绑定流程时，要转去的落地页。 */
  forwardTo: string | null
  /** 登录语义的失败信息：就地显示提示。 */
  failure: CallbackFailure | null
}

/**
 * 回调失败落地的分流。
 *
 * 后端在 state 过期/不匹配时无从判断流程，一律送到 `/login`；前端用自己记的
 * 「刚才那次是绑定」把它转去绑定落地页，避免用户在登录页看到文不对题的提示。
 */
function resolveCallbackLanding(params: URLSearchParams): CallbackLanding {
  const failure = parseCallbackFailure(params.toString())
  if (!failure) {
    return { forwardTo: null, failure: null }
  }
  const isBindAttempt = params.get('mode') === 'bind' || recallAuthAttempt()?.mode === 'bind'
  return {
    forwardTo: isBindAttempt ? buildBindErrorPath(failure.reason, failure.provider) : null,
    failure,
  }
}

export function LoginPage() {
  const { t } = useTranslation('auth')
  const [searchParams] = useSearchParams()
  const returnTo = sanitizeReturnTo(searchParams.get('return_to'))
  // 改口令后后端作废了全部会话，前端带着 ?notice= 回到这里解释原因。
  const passwordChangedNotice =
    searchParams.get('notice') === RELOGIN_NOTICE_PASSWORD_CHANGED
  const callback = resolveCallbackLanding(searchParams)
  const meQuery = useMeQuery()

  const providersQuery = useQuery({
    queryKey: ['auth', 'providers'],
    queryFn: getAuthProviders,
    retry: false,
  })

  // 必须放在 me 短路之前：绑定失败时用户往往还是登录态，否则会被弹回应用、提示看不见。
  if (callback.forwardTo) {
    return <Navigate to={callback.forwardTo} replace />
  }

  if (meQuery.isPending) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: 'background.default' }}>
        <CircularProgress size={24} />
      </Box>
    )
  }

  if (meQuery.isSuccess) {
    return <Navigate to={returnTo} replace />
  }

  const providers = providersQuery.data?.providers ?? []
  // 字段缺失（旧后端）按未开启处理：绝不渲染一个后端还没实现的表单。
  const passwordEnabled = providersQuery.data?.password_enabled === true

  return (
    <AuthShell title={t('login.title')} subtitle={t('login.subtitle')} busy={providersQuery.isPending}>
      {callback.failure ? (
        <Alert
          data-testid="login-callback-error"
          severity="error"
          sx={{ width: '100%', textAlign: 'left' }}
        >
          {describeCallbackFailure(
            callback.failure.reason,
            callback.failure.provider,
            'login',
            t,
          )}
        </Alert>
      ) : null}

      {passwordChangedNotice ? (
        <Alert
          data-testid="login-notice-password-changed"
          severity="info"
          sx={{ width: '100%', textAlign: 'left' }}
        >
          {t('login.passwordChangedNotice')}
        </Alert>
      ) : null}

      {passwordEnabled ? <PasswordLoginForm returnTo={returnTo} /> : null}

      {passwordEnabled ? (
        <Stack direction="row" spacing={workspaceSpace.md} sx={{ width: '100%', alignItems: 'center' }}>
          <Divider sx={{ flex: 1 }} />
          <Typography variant="caption" color="text.secondary">
            {t('login.divider')}
          </Typography>
          <Divider sx={{ flex: 1 }} />
        </Stack>
      ) : null}

      {providersQuery.isPending ? (
        <Stack
          direction="row"
          spacing={workspaceSpace.sm}
          aria-live="polite"
          sx={{ minHeight: 44, alignItems: 'center' }}
        >
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            {t('login.loading')}
          </Typography>
        </Stack>
      ) : providersQuery.isError ? (
        <Stack
          data-testid="login-error"
          spacing={workspaceSpace.md}
          sx={{ width: '100%', alignItems: 'center' }}
        >
          <Typography variant="body2" color="text.secondary">
            {t('login.error')}
          </Typography>
          <Button
            variant="outlined"
            onClick={() => void providersQuery.refetch()}
            sx={providerButtonSx}
          >
            {t('login.retry')}
          </Button>
        </Stack>
      ) : providers.length === 0 ? (
        <Typography data-testid="login-empty" variant="body2" color="text.secondary">
          {t('login.empty')}
        </Typography>
      ) : (
        <Stack spacing={providerGap} sx={{ width: '100%' }}>
          {providers.map((provider) => {
            const label = providerLabel(provider.name, t)
            return (
              <Button
                key={provider.name}
                data-provider={provider.name}
                variant="outlined"
                fullWidth
                startIcon={<ProviderIcon name={provider.name} size={workspaceIconSize.md} />}
                onClick={() => goToAuthLogin({ provider: provider.name, from: 'web', returnTo })}
                sx={providerButtonSx}
              >
                {t('login.continueWith', { provider: label })}
              </Button>
            )
          })}
        </Stack>
      )}

      {passwordEnabled ? (
        <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', gap: '6px' }}>
          {t('login.noAccount')}
          <Box
            component={Link}
            to={buildSignupPath(returnTo)}
            data-testid="login-signup-link"
            sx={textLinkSx}
          >
            {t('login.signupLink')}
          </Box>
        </Typography>
      ) : null}
    </AuthShell>
  )
}
