import { useState, type FormEvent } from 'react'
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { registerEmail } from '../api/auth'
import {
  AUTH_ERROR_CODE,
  buildLoginPath,
  buildVerifyEmailPath,
  isAuthErrorCode,
  sanitizeReturnTo,
} from '../lib/auth'
import {
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
  isValidEmail,
  isValidPassword,
  normalizeEmail,
  passwordByteLength,
} from '../lib/authValidation'
import { useMeQuery } from '../components/auth/useMeQuery'
import { AuthShell } from '../components/auth/AuthShell'
import { authSubmitButtonSx, textLinkSx } from '../components/auth/authStyles'
import { workspaceSpace } from '../components/notebook-workspace/shared/ui/layoutTokens'

/** 注册失败文案；注册接口刻意「明确报错」（登录接口才统一文案）。 */
function describeRegisterError(error: unknown, t: TFunction): string {
  if (isAuthErrorCode(error, AUTH_ERROR_CODE.emailTaken)) {
    return t('signup.emailTaken')
  }
  if (isAuthErrorCode(error, AUTH_ERROR_CODE.emailInvalid)) {
    return t('signup.emailInvalid')
  }
  if (isAuthErrorCode(error, AUTH_ERROR_CODE.weakPassword)) {
    return t('signup.passwordTooShort', { min: PASSWORD_MIN_LENGTH })
  }
  if (isAuthErrorCode(error, AUTH_ERROR_CODE.tooManyRequests)) {
    return t('login.tooManyRequests')
  }
  return t('signup.failed')
}

export function SignupPage() {
  const { t } = useTranslation('auth')
  const [searchParams] = useSearchParams()
  const returnTo = sanitizeReturnTo(searchParams.get('return_to'))
  const navigate = useNavigate()
  const meQuery = useMeQuery()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [touched, setTouched] = useState(false)

  const normalizedEmail = normalizeEmail(email)
  const passwordBytes = passwordByteLength(password)
  const passwordTooShort = passwordBytes > 0 && passwordBytes < PASSWORD_MIN_LENGTH
  const passwordTooLong = passwordBytes > PASSWORD_MAX_BYTES
  const passwordMismatch = confirm.length > 0 && confirm !== password
  const emailInvalid = touched && !isValidEmail(email)

  const registerMutation = useMutation({
    mutationFn: registerEmail,
    onSuccess: () => {
      // 注册只写 pending：真正建号发生在验证成功那一刻，因此这里跳验证页而不是首页。
      navigate(buildVerifyEmailPath({ email: normalizedEmail, returnTo }), { replace: true })
    },
  })

  const canSubmit =
    isValidEmail(email) &&
    isValidPassword(password) &&
    confirm === password &&
    !registerMutation.isPending

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTouched(true)
    if (!canSubmit) {
      return
    }
    registerMutation.mutate({ email: normalizedEmail, password })
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

  return (
    <AuthShell title={t('signup.title')} subtitle={t('signup.subtitle')} busy={registerMutation.isPending}>
      <Box component="form" noValidate onSubmit={handleSubmit} sx={{ width: '100%' }}>
        <Stack spacing={workspaceSpace.md}>
          <TextField
            fullWidth
            size="small"
            type="email"
            name="email"
            autoComplete="email"
            label={t('signup.emailLabel')}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={registerMutation.isPending}
            error={emailInvalid}
            helperText={emailInvalid ? t('signup.emailInvalid') : undefined}
            slotProps={{ htmlInput: { 'data-testid': 'signup-email-input' } }}
          />
          <TextField
            fullWidth
            size="small"
            type="password"
            name="password"
            autoComplete="new-password"
            label={t('signup.passwordLabel')}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={registerMutation.isPending}
            error={passwordTooShort || passwordTooLong}
            helperText={
              passwordTooLong
                ? t('signup.passwordTooLong', { max: PASSWORD_MAX_BYTES })
                : passwordTooShort
                  ? t('signup.passwordTooShort', { min: PASSWORD_MIN_LENGTH })
                  : t('signup.passwordHint', { min: PASSWORD_MIN_LENGTH })
            }
            slotProps={{ htmlInput: { 'data-testid': 'signup-password-input' } }}
          />
          <TextField
            fullWidth
            size="small"
            type="password"
            name="confirm-password"
            autoComplete="new-password"
            label={t('signup.confirmLabel')}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            disabled={registerMutation.isPending}
            error={passwordMismatch}
            helperText={passwordMismatch ? t('signup.passwordMismatch') : undefined}
            slotProps={{ htmlInput: { 'data-testid': 'signup-confirm-input' } }}
          />

          {registerMutation.isError ? (
            <Alert data-testid="signup-error" severity="error" sx={{ textAlign: 'left' }}>
              {describeRegisterError(registerMutation.error, t)}
            </Alert>
          ) : null}

          <Button
            data-testid="signup-submit"
            type="submit"
            variant="contained"
            fullWidth
            disabled={!canSubmit}
            sx={authSubmitButtonSx}
          >
            {registerMutation.isPending ? t('signup.submitting') : t('signup.submit')}
          </Button>
        </Stack>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', gap: '6px' }}>
        {t('signup.haveAccount')}
        <Box component={Link} to={buildLoginPath(returnTo)} data-testid="signup-login-link" sx={textLinkSx}>
          {t('signup.loginLink')}
        </Box>
      </Typography>
    </AuthShell>
  )
}
