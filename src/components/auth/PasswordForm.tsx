import { useState, type FormEvent } from 'react'
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { setPassword } from '../../api/auth'
import { AUTH_ERROR_CODE, isAuthErrorCode } from '../../lib/auth'
import {
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
  isValidPassword,
  passwordByteLength,
} from '../../lib/authValidation'
import { workspaceSpace } from '../notebook-workspace/shared/ui/layoutTokens'
import { ME_QUERY_KEY } from './useMeQuery'
import { authSubmitButtonSx } from './authStyles'

interface PasswordFormProps {
  /** 账号是否已有口令：决定要不要校验「当前口令」以及文案（设置 vs 修改）。 */
  hasPassword: boolean
  /** 保存成功回调；引导页用来继续跳转，设置区用来收起表单。 */
  onSaved?: () => void
  /** 次要动作（引导页的「稍后再说」）；不传则不渲染。 */
  onSkip?: () => void
  /** data-testid 前缀，同一组件在引导页与设置区各有一套断言。 */
  testIdPrefix?: string
}

function describePasswordError(error: unknown, t: TFunction): string {
  if (isAuthErrorCode(error, AUTH_ERROR_CODE.invalidCredentials)) {
    return t('password.wrongOldPassword')
  }
  if (isAuthErrorCode(error, AUTH_ERROR_CODE.weakPassword)) {
    return t('password.weakPassword', { min: PASSWORD_MIN_LENGTH })
  }
  if (isAuthErrorCode(error, AUTH_ERROR_CODE.tooManyRequests)) {
    return t('login.tooManyRequests')
  }
  return t('password.failed')
}

/**
 * 设置/修改口令表单（PUT /auth/password）。
 *
 * 两处复用：`/set-password` 引导页（注册票据不匹配、或账号尚无口令时）与
 * 设置弹窗的「账号安全」区。口令只在请求体里传递，不落任何本地存储。
 */
export function PasswordForm({
  hasPassword,
  onSaved,
  onSkip,
  testIdPrefix = 'password',
}: PasswordFormProps) {
  const { t } = useTranslation('auth')
  const queryClient = useQueryClient()

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [touched, setTouched] = useState(false)
  const [saved, setSaved] = useState(false)

  const mutation = useMutation({
    mutationFn: setPassword,
    onSuccess: async () => {
      setSaved(true)
      setCurrent('')
      setNext('')
      setConfirm('')
      setTouched(false)
      // has_password 会因此从 false 变 true，让 me 查询重新取一次。
      await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY })
      onSaved?.()
    },
  })

  const nextBytes = passwordByteLength(next)
  const nextTooShort = touched && nextBytes < PASSWORD_MIN_LENGTH
  const nextTooLong = nextBytes > PASSWORD_MAX_BYTES
  const mismatch = confirm.length > 0 && confirm !== next
  const currentRequired = touched && hasPassword && current.length === 0

  const canSubmit =
    (!hasPassword || current.length > 0) && isValidPassword(next) && confirm === next && !mutation.isPending

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTouched(true)
    setSaved(false)
    if (!canSubmit) {
      return
    }
    mutation.mutate(
      hasPassword ? { old_password: current, new_password: next } : { new_password: next },
    )
  }

  return (
    <Box component="form" noValidate onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <Stack spacing={workspaceSpace.md}>
        {hasPassword ? (
          <TextField
            fullWidth
            size="small"
            type="password"
            name="current-password"
            autoComplete="current-password"
            label={t('password.currentLabel')}
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            disabled={mutation.isPending}
            error={currentRequired}
            slotProps={{ htmlInput: { 'data-testid': `${testIdPrefix}-current-input` } }}
          />
        ) : null}
        <TextField
          fullWidth
          size="small"
          type="password"
          name="new-password"
          autoComplete="new-password"
          label={t('password.newLabel')}
          value={next}
          onChange={(event) => setNext(event.target.value)}
          disabled={mutation.isPending}
          error={nextTooShort || nextTooLong}
          helperText={
            nextTooLong
              ? t('signup.passwordTooLong', { max: PASSWORD_MAX_BYTES })
              : nextTooShort
                ? t('password.weakPassword', { min: PASSWORD_MIN_LENGTH })
                : t('password.hint', { min: PASSWORD_MIN_LENGTH })
          }
          slotProps={{ htmlInput: { 'data-testid': `${testIdPrefix}-new-input` } }}
        />
        <TextField
          fullWidth
          size="small"
          type="password"
          name="confirm-password"
          autoComplete="new-password"
          label={t('password.confirmLabel')}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          disabled={mutation.isPending}
          error={mismatch}
          helperText={mismatch ? t('password.mismatch') : undefined}
          slotProps={{ htmlInput: { 'data-testid': `${testIdPrefix}-confirm-input` } }}
        />

        {mutation.isError ? (
          <Alert data-testid={`${testIdPrefix}-error`} severity="error" sx={{ textAlign: 'left' }}>
            {describePasswordError(mutation.error, t)}
          </Alert>
        ) : null}

        <Stack direction="row" spacing={workspaceSpace.md} sx={{ alignItems: 'center' }}>
          <Button
            data-testid={`${testIdPrefix}-submit`}
            type="submit"
            variant="contained"
            disabled={!canSubmit}
            sx={authSubmitButtonSx}
          >
            {mutation.isPending ? t('password.submitting') : t('password.submit')}
          </Button>
          {saved ? (
            <Typography
              data-testid={`${testIdPrefix}-saved`}
              role="status"
              variant="caption"
              color="success.main"
            >
              {t('password.saved')}
            </Typography>
          ) : null}
          {onSkip ? (
            <Button data-testid={`${testIdPrefix}-skip`} variant="text" onClick={onSkip}>
              {t('password.skip')}
            </Button>
          ) : null}
        </Stack>
      </Stack>
    </Box>
  )
}
