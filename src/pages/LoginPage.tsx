import { useState, type FormEvent, type ReactElement } from 'react'
import { Alert, Box, Button, CircularProgress, Divider, Stack, TextField, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AppleIcon from '@mui/icons-material/Apple'
import GitHubIcon from '@mui/icons-material/GitHub'
import { getAuthProviders, goToAuthLogin, passwordLogin } from '../api/auth'
import { AUTH_ERROR_CODE, buildSignupPath, isAuthErrorCode, sanitizeReturnTo } from '../lib/auth'
import { isValidEmail, normalizeEmail } from '../lib/authValidation'
import { ME_QUERY_KEY, useMeQuery } from '../components/auth/useMeQuery'
import { AuthShell } from '../components/auth/AuthShell'
import { authSubmitButtonSx, providerButtonSx, textLinkSx } from '../components/auth/authStyles'
import { workspaceIconSize } from '../components/notebook-workspace/shared/ui/typeTokens'
import { workspaceSpace } from '../components/notebook-workspace/shared/ui/layoutTokens'

const providerGap = 1.5

/** Backend decides which providers exist; unknown names fall back to no mark. */
function providerIcon(name: string): ReactElement | null {
  if (name === 'github') {
    return <GitHubIcon sx={{ fontSize: workspaceIconSize.md }} />
  }
  if (name === 'apple') {
    return <AppleIcon sx={{ fontSize: workspaceIconSize.md }} />
  }
  if (name === 'google') {
    return <GoogleGlyph size={workspaceIconSize.md} />
  }
  return null
}

function GoogleGlyph({ size }: { size: number }) {
  // Brand mark stays four-color (Google identity), unlike the quiet monochrome UI icons.
  return (
    <Box
      component="svg"
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
      sx={{ width: size, height: size, display: 'block', flex: '0 0 auto' }}
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Box>
  )
}

function providerLabel(name: string, t: (key: string) => string): string {
  const known = t(`provider.${name}`)
  return known === `provider.${name}` ? name : known
}

/** 登录失败文案：账号不存在与口令错误共用统一文案，避免登录变成账号枚举器。 */
function describePasswordLoginError(error: unknown, t: (key: string) => string): string {
  if (isAuthErrorCode(error, AUTH_ERROR_CODE.invalidCredentials)) {
    return t('login.invalidCredentials')
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

export function LoginPage() {
  const { t } = useTranslation('auth')
  const [searchParams] = useSearchParams()
  const returnTo = sanitizeReturnTo(searchParams.get('return_to'))
  const meQuery = useMeQuery()

  const providersQuery = useQuery({
    queryKey: ['auth', 'providers'],
    queryFn: getAuthProviders,
    retry: false,
  })

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
                startIcon={providerIcon(provider.name) ?? undefined}
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
