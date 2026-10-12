import { useState, type FormEvent } from 'react'
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material'
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { setPassword } from '../../api/auth'
import { AUTH_ERROR_CODE, isAuthErrorCode } from '../../lib/auth'
import type { SetPasswordResponse } from '../../types/api'
import {
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
  isComplexPassword,
  isValidPassword,
  passwordByteLength,
} from '../../lib/authValidation'
import { workspaceSpace } from '../notebook-workspace/shared/ui/layoutTokens'
import { ME_QUERY_KEY } from './useMeQuery'
import { useRequireComplexPassword } from './usePasswordPolicy'
import { PasswordPolicyHints } from './PasswordPolicyHints'
import { PasswordVisibilityToggle } from './PasswordVisibilityToggle'
import { authSubmitButtonSx } from './authStyles'

interface PasswordFormProps {
  /** 账号是否已有密码：决定要不要校验「当前密码」以及文案（设置 vs 修改）。 */
  hasPassword: boolean
  /**
   * 保存成功回调；引导页用来跳转，设置区用来收起表单。
   *
   * 入参是后端响应：`relogin_required` 为真时全部会话已作废，调用方必须把用户
   * 送回登录页，不能留在当前界面。
   */
  onSaved?: (result: SetPasswordResponse) => void
  /** 次要动作（引导页的「稍后再说」）；不传则不渲染。 */
  onSkip?: () => void
  /** data-testid 前缀，同一组件在引导页与设置区各有一套断言。 */
  testIdPrefix?: string
}

function describePasswordError(
  error: unknown,
  t: TFunction,
  requireComplexPassword: boolean,
): string {
  if (isAuthErrorCode(error, AUTH_ERROR_CODE.invalidCredentials)) {
    return t('password.wrongOldPassword')
  }
  if (isAuthErrorCode(error, AUTH_ERROR_CODE.weakPassword)) {
    return requireComplexPassword
      ? t('password.weakPasswordComplex', { min: PASSWORD_MIN_LENGTH })
      : t('password.weakPassword', { min: PASSWORD_MIN_LENGTH })
  }
  if (isAuthErrorCode(error, AUTH_ERROR_CODE.tooManyRequests)) {
    return t('login.tooManyRequests')
  }
  if (isAuthErrorCode(error, AUTH_ERROR_CODE.passwordUnchanged)) {
    return t('password.unchanged')
  }
  return t('password.failed')
}

/**
 * 保存成功后的缓存收尾。
 *
 * `reloginRequired` 为真表示后端作废了全部会话（含当前）：必须把缓存的 me 删掉，
 * 否则登录页会拿旧的成功数据把用户又弹回受保护页面；否则只需让 me 重新取一次
 * （`has_password` 从 false 变成了 true）。
 */
async function syncMeAfterPasswordSave(
  queryClient: QueryClient,
  reloginRequired: boolean,
): Promise<void> {
  if (reloginRequired) {
    queryClient.removeQueries({ queryKey: ME_QUERY_KEY })
    return
  }
  await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY })
}

/**
 * 设置/修改密码表单（PUT /auth/password）。
 *
 * 两处复用：`/set-password` 引导页（注册票据不匹配、或账号尚无密码时）与
 * 设置弹窗的「账号安全」区。密码只在请求体里传递，不落任何本地存储。
 */
export function PasswordForm({
  hasPassword,
  onSaved,
  onSkip,
  testIdPrefix = 'password',
}: PasswordFormProps) {
  const { t } = useTranslation('auth')
  const queryClient = useQueryClient()
  // 与注册共用同一个服务端策略，避免这里放行、后端 106014 打回
  const requireComplexPassword = useRequireComplexPassword()

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [touched, setTouched] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const mutation = useMutation({
    mutationFn: setPassword,
    onSuccess: async (result) => {
      const reloginRequired = result?.relogin_required === true
      setCurrent('')
      setNext('')
      setConfirm('')
      setTouched(false)
      setSaved(!reloginRequired)
      await syncMeAfterPasswordSave(queryClient, reloginRequired)
      onSaved?.(result)
    },
  })

  const nextBytes = passwordByteLength(next)
  // 新密码已经在敲（或点过保存）之后，未满足的规则才报红；空着没动过时不提前骂人。
  const nextTouched = touched || nextBytes > 0
  const nextTooShort = nextBytes < PASSWORD_MIN_LENGTH && nextTouched
  const nextTooLong = nextBytes > PASSWORD_MAX_BYTES
  // 复杂度必须和长度一样实时：只靠点保存才报，用户根本不知道差哪一条。
  const nextTooSimple =
    requireComplexPassword &&
    nextTouched &&
    nextBytes >= PASSWORD_MIN_LENGTH &&
    nextBytes <= PASSWORD_MAX_BYTES &&
    !isComplexPassword(next)
  const nextNeedsAttention = nextTooShort || nextTooLong || nextTooSimple
  const mismatch = confirm.length > 0 && confirm !== next
  const currentRequired = touched && hasPassword && current.length === 0

  /**
   * 校验只决定「要不要发请求」，不再决定按钮能不能点：
   * 按钮始终可点（仅请求进行中禁用），点了才把错误亮出来。
   */
  const formValid =
    (!hasPassword || current.length > 0) &&
    isValidPassword(next, requireComplexPassword) &&
    confirm === next

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTouched(true)
    setSaved(false)
    if (mutation.isPending || !formValid) {
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
            type={showCurrent ? 'text' : 'password'}
            name="current-password"
            autoComplete="current-password"
            label={t('password.currentLabel')}
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            disabled={mutation.isPending}
            error={currentRequired}
            helperText={currentRequired ? t('password.currentRequired') : undefined}
            slotProps={{
              htmlInput: { 'data-testid': `${testIdPrefix}-current-input` },
              input: {
                endAdornment: (
                  <PasswordVisibilityToggle
                    shown={showCurrent}
                    onToggle={() => setShowCurrent((shown) => !shown)}
                    testId={`${testIdPrefix}-current-visibility`}
                  />
                ),
              },
            }}
          />
        ) : null}
        <TextField
          fullWidth
          size="small"
          type={showNext ? 'text' : 'password'}
          name="new-password"
          autoComplete="new-password"
          label={t('password.newLabel')}
          value={next}
          onChange={(event) => setNext(event.target.value)}
          disabled={mutation.isPending}
          error={nextNeedsAttention}
          helperText={
            requireComplexPassword ? (
              <PasswordPolicyHints
                value={next}
                requireComplex={requireComplexPassword}
                showErrors={nextNeedsAttention}
                testId={`${testIdPrefix}-hints`}
              />
            ) : nextTooLong ? (
              t('signup.passwordTooLong', { max: PASSWORD_MAX_BYTES })
            ) : nextTooShort ? (
              t('password.weakPassword', { min: PASSWORD_MIN_LENGTH })
            ) : (
              t('password.hint', { min: PASSWORD_MIN_LENGTH })
            )
          }
          slotProps={{
            htmlInput: { 'data-testid': `${testIdPrefix}-new-input` },
            input: {
              endAdornment: (
                <PasswordVisibilityToggle
                  shown={showNext}
                  onToggle={() => setShowNext((shown) => !shown)}
                  testId={`${testIdPrefix}-new-visibility`}
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
          label={t('password.confirmLabel')}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          disabled={mutation.isPending}
          error={mismatch}
          helperText={mismatch ? t('password.mismatch') : undefined}
          slotProps={{
            htmlInput: { 'data-testid': `${testIdPrefix}-confirm-input` },
            input: {
              endAdornment: (
                <PasswordVisibilityToggle
                  shown={showConfirm}
                  onToggle={() => setShowConfirm((shown) => !shown)}
                  testId={`${testIdPrefix}-confirm-visibility`}
                />
              ),
            },
          }}
        />

        {mutation.isError ? (
          <Alert data-testid={`${testIdPrefix}-error`} severity="error" sx={{ textAlign: 'left' }}>
            {describePasswordError(mutation.error, t, requireComplexPassword)}
          </Alert>
        ) : null}

        <Stack direction="row" spacing={workspaceSpace.md} sx={{ alignItems: 'center' }}>
          <Button
            data-testid={`${testIdPrefix}-submit`}
            type="submit"
            variant="contained"
            disabled={mutation.isPending}
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
