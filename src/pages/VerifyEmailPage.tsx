import { useState, type FormEvent } from 'react'
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { resendVerificationEmail, verifyEmailCode } from '../api/auth'
import { getMe } from '../api/user'
import { AUTH_ERROR_CODE, buildLoginPath, buildSetPasswordPath, isAuthErrorCode, sanitizeReturnTo } from '../lib/auth'
import {
  VERIFICATION_CODE_LENGTH,
  isValidEmail,
  isValidVerificationCode,
  normalizeEmail,
  normalizeVerificationCode,
} from '../lib/authValidation'
import { AuthShell } from '../components/auth/AuthShell'
import { authSubmitButtonSx, textLinkSx } from '../components/auth/authStyles'
import { ME_QUERY_KEY } from '../components/auth/useMeQuery'
import type { MeResponse } from '../types/api'
import { workspaceSpace } from '../components/notebook-workspace/shared/ui/layoutTokens'

/** 验证码失败的文案。 */
function describeVerifyError(error: unknown, t: (key: string) => string): string {
  if (isAuthErrorCode(error, AUTH_ERROR_CODE.verificationExpired)) {
    return t('verify.expired')
  }
  if (isAuthErrorCode(error, AUTH_ERROR_CODE.verificationCodeMismatch)) {
    return t('verify.codeMismatch')
  }
  if (isAuthErrorCode(error, AUTH_ERROR_CODE.verificationAttemptsExceeded)) {
    return t('verify.attemptsExceeded')
  }
  if (isAuthErrorCode(error, AUTH_ERROR_CODE.tooManyRequests)) {
    return t('login.tooManyRequests')
  }
  return t('verify.failed')
}

function describeResendError(error: unknown, t: (key: string) => string): string {
  if (isAuthErrorCode(error, AUTH_ERROR_CODE.emailTaken)) {
    return t('verify.resendRegistered')
  }
  if (isAuthErrorCode(error, AUTH_ERROR_CODE.verificationExpired)) {
    return t('verify.resendMissing')
  }
  return t('verify.resendFailed')
}

/**
 * 邮箱验证页（`/signup` 注册成功后带着 `?email=` 跳过来）。
 *
 * 注册只认 6 位验证码：后端已下线 `POST /auth/email/verify`（链接验证）与邮件里的验证链接，
 * 验证信只带验证码（`verify_email.txt`），所以这一页只有验证码一种形态。
 *
 * 服务端验证成功即建号并签发会话；若注册票据不匹配（换设备验证），
 * `has_password` 会是 false，于是转到设置密码页补齐密码。
 */
export function VerifyEmailPage() {
  const { t } = useTranslation('auth')
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const emailFromQuery = normalizeEmail(searchParams.get('email') ?? '')
  const returnTo = sanitizeReturnTo(searchParams.get('return_to'))

  const [email, setEmail] = useState(emailFromQuery)
  const [code, setCode] = useState('')
  const [resent, setResent] = useState(false)

  /** 验证成功后统一收尾：读一次 me 决定是否需要补设密码，再回到 return_to。 */
  const finishVerification = async () => {
    const me = await queryClient
      // staleTime: 0 —— 会话刚签发，必须重新取一次，不能吃旧缓存。
      .fetchQuery<MeResponse>({ queryKey: ME_QUERY_KEY, queryFn: getMe, staleTime: 0 })
      .catch(() => null)
    if (me && me.has_password === false) {
      navigate(buildSetPasswordPath(returnTo), { replace: true })
      return
    }
    navigate(returnTo, { replace: true })
  }

  const codeMutation = useMutation({
    mutationFn: verifyEmailCode,
    onSuccess: () => void finishVerification(),
  })

  const resendMutation = useMutation({
    mutationFn: resendVerificationEmail,
    onSuccess: () => setResent(true),
  })

  const pending = codeMutation.isPending
  const normalizedEmail = normalizeEmail(email)
  const canSubmitCode = isValidEmail(email) && isValidVerificationCode(code) && !pending

  const handleCodeSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmitCode) {
      return
    }
    setResent(false)
    codeMutation.mutate({ email: normalizedEmail, code: normalizeVerificationCode(code) })
  }

  const handleResend = () => {
    if (!isValidEmail(email) || resendMutation.isPending) {
      return
    }
    setResent(false)
    resendMutation.mutate({ email: normalizedEmail })
  }

  return (
    <AuthShell
      title={t('verify.title')}
      subtitle={t('verify.subtitle')}
      busy={pending}
      showLegal={false}
    >
      <Box component="form" noValidate onSubmit={handleCodeSubmit} sx={{ width: '100%' }}>
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
            disabled={pending}
            slotProps={{ htmlInput: { 'data-testid': 'verify-email-input' } }}
          />
          <TextField
            fullWidth
            size="small"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            label={t('verify.codeLabel')}
            value={code}
            onChange={(event) => setCode(normalizeVerificationCode(event.target.value))}
            disabled={pending}
            slotProps={{
              htmlInput: {
                'data-testid': 'verify-code-input',
                maxLength: VERIFICATION_CODE_LENGTH,
              },
            }}
          />

          {codeMutation.isError ? (
            <Alert data-testid="verify-error" severity="error" sx={{ textAlign: 'left' }}>
              {describeVerifyError(codeMutation.error, t)}
            </Alert>
          ) : null}

          {resendMutation.isError ? (
            <Alert data-testid="verify-resend-error" severity="error" sx={{ textAlign: 'left' }}>
              {describeResendError(resendMutation.error, t)}
            </Alert>
          ) : null}

          {resent ? (
            <Typography data-testid="verify-resent" role="status" variant="caption" color="success.main">
              {t('verify.resent')}
            </Typography>
          ) : null}

          <Button
            data-testid="verify-code-submit"
            type="submit"
            variant="contained"
            fullWidth
            disabled={!canSubmitCode}
            sx={authSubmitButtonSx}
          >
            {pending ? t('verify.verifying') : t('verify.codeSubmit')}
          </Button>

          <Button
            data-testid="verify-resend"
            variant="text"
            disabled={!isValidEmail(email) || resendMutation.isPending}
            onClick={handleResend}
            sx={textLinkSx}
          >
            {resendMutation.isPending ? t('verify.resending') : t('verify.resend')}
          </Button>
        </Stack>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', gap: '6px' }}>
        <Box
          component={Link}
          to={buildLoginPath(returnTo)}
          data-testid="verify-login-link"
          sx={textLinkSx}
        >
          {t('signup.loginLink')}
        </Box>
      </Typography>
    </AuthShell>
  )
}
