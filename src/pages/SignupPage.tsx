import { useState, type FormEvent } from 'react'
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
  isComplexPassword,
  isValidEmail,
  isValidPassword,
  normalizeEmail,
  passwordByteLength,
} from '../lib/authValidation'
import { ME_QUERY_KEY, useMeQuery } from '../components/auth/useMeQuery'
import { useRequireComplexPassword } from '../components/auth/usePasswordPolicy'
import { PasswordPolicyHints } from '../components/auth/PasswordPolicyHints'
import { PasswordVisibilityToggle } from '../components/auth/PasswordVisibilityToggle'
import { AuthShell } from '../components/auth/AuthShell'
import { authSubmitButtonSx, textLinkSx } from '../components/auth/authStyles'
import { workspaceSpace } from '../components/notebook-workspace/shared/ui/layoutTokens'

/** 注册失败文案；注册接口刻意「明确报错」（登录接口才统一文案）。 */
function describeRegisterError(
  error: unknown,
  t: TFunction,
  requireComplexPassword: boolean,
): string {
  if (isAuthErrorCode(error, AUTH_ERROR_CODE.emailTaken)) {
    return t('signup.emailTaken')
  }
  if (isAuthErrorCode(error, AUTH_ERROR_CODE.emailInvalid)) {
    return t('signup.emailInvalid')
  }
  if (isAuthErrorCode(error, AUTH_ERROR_CODE.weakPassword)) {
    return requireComplexPassword
      ? t('signup.passwordComplexRequired', { min: PASSWORD_MIN_LENGTH })
      : t('signup.passwordTooShort', { min: PASSWORD_MIN_LENGTH })
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
  const queryClient = useQueryClient()
  const meQuery = useMeQuery()
  // 密码策略由服务端下发：开了复杂密码就按复杂规则即时校验
  const requireComplexPassword = useRequireComplexPassword()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [touched, setTouched] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const normalizedEmail = normalizeEmail(email)
  const passwordBytes = passwordByteLength(password)
  // 用户已经在敲字（或点过注册）之后，未满足的规则才报红；空着没动过时不提前骂人。
  const passwordTouched = touched || passwordBytes > 0
  const passwordTooShort = passwordBytes < PASSWORD_MIN_LENGTH && passwordTouched
  const passwordTooLong = passwordBytes > PASSWORD_MAX_BYTES
  // 复杂度必须和长度一样实时：只靠点提交才报，用户根本不知道差哪一条。
  const passwordTooSimple =
    requireComplexPassword &&
    passwordTouched &&
    passwordBytes >= PASSWORD_MIN_LENGTH &&
    passwordBytes <= PASSWORD_MAX_BYTES &&
    !isComplexPassword(password)
  const passwordNeedsAttention = passwordTooShort || passwordTooLong || passwordTooSimple
  const passwordMismatch = confirm.length > 0 && confirm !== password
  const emailInvalid = touched && !isValidEmail(email)

  const registerMutation = useMutation({
    mutationFn: registerEmail,
    onSuccess: async (result) => {
      // 免验证模式：后端已建号并签发会话，让 me 失效后直接进 return_to
      if (result?.email_verified) {
        await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY })
        navigate(returnTo, { replace: true })
        return
      }
      // 需要验证：注册只写 pending，真正建号发生在验证成功那一刻，因此这里跳验证页而不是首页。
      navigate(buildVerifyEmailPath({ email: normalizedEmail, returnTo }), { replace: true })
    },
  })

  /**
   * 校验只决定「要不要发请求」，不再决定按钮能不能点：
   * 按钮始终可点（仅请求进行中禁用），点了才把错误亮出来。
   */
  const formValid =
    isValidEmail(email) &&
    isValidPassword(password, requireComplexPassword) &&
    confirm === password

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTouched(true)
    if (registerMutation.isPending || !formValid) {
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
            type={showPassword ? 'text' : 'password'}
            name="password"
            autoComplete="new-password"
            label={t('signup.passwordLabel')}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={registerMutation.isPending}
            error={passwordNeedsAttention}
            helperText={
              requireComplexPassword ? (
                <PasswordPolicyHints
                  value={password}
                  requireComplex={requireComplexPassword}
                  showErrors={passwordNeedsAttention}
                  testId="signup-password-hints"
                />
              ) : passwordTooLong ? (
                t('signup.passwordTooLong', { max: PASSWORD_MAX_BYTES })
              ) : passwordTooShort ? (
                t('signup.passwordTooShort', { min: PASSWORD_MIN_LENGTH })
              ) : (
                t('signup.passwordHint', { min: PASSWORD_MIN_LENGTH })
              )
            }
            slotProps={{
              htmlInput: { 'data-testid': 'signup-password-input' },
              input: {
                endAdornment: (
                  <PasswordVisibilityToggle
                    shown={showPassword}
                    onToggle={() => setShowPassword((shown) => !shown)}
                    testId="signup-password-visibility"
                  />
                ),
              },
              // 清单是 <ul>，不能塞进 FormHelperText 默认的 <p> 里
              formHelperText: { component: 'div' },
            }}
          />
          <TextField
            fullWidth
            size="small"
            type={showConfirm ? 'text' : 'password'}
            name="confirm-password"
            autoComplete="new-password"
            label={t('signup.confirmLabel')}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            disabled={registerMutation.isPending}
            error={passwordMismatch}
            helperText={passwordMismatch ? t('signup.passwordMismatch') : undefined}
            slotProps={{
              htmlInput: { 'data-testid': 'signup-confirm-input' },
              input: {
                endAdornment: (
                  <PasswordVisibilityToggle
                    shown={showConfirm}
                    onToggle={() => setShowConfirm((shown) => !shown)}
                    testId="signup-confirm-visibility"
                  />
                ),
              },
            }}
          />

          {registerMutation.isError ? (
            <Alert data-testid="signup-error" severity="error" sx={{ textAlign: 'left' }}>
              {describeRegisterError(registerMutation.error, t, requireComplexPassword)}
            </Alert>
          ) : null}

          <Button
            data-testid="signup-submit"
            type="submit"
            variant="contained"
            fullWidth
            disabled={registerMutation.isPending}
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
