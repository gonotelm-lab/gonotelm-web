import { useState, type FormEvent } from 'react'
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material'
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { setPassword } from '../../api/auth'
import { AUTH_ERROR_CODE, isAuthErrorCode } from '../../lib/auth'
import type { SetPasswordResponse } from '../../types/api'
import {
  PASSWORD_MIN_LENGTH,
  isValidPassword,
  passwordByteLength,
} from '../../lib/authValidation'
import { workspaceSpace } from '../notebook-workspace/shared/ui/layoutTokens'
import { ME_QUERY_KEY } from './useMeQuery'
import { useRequireComplexPassword } from './usePasswordPolicy'
import { NewPasswordFields } from './NewPasswordFields'
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
        <NewPasswordFields
          password={next}
          confirm={confirm}
          onPasswordChange={setNext}
          onConfirmChange={setConfirm}
          requireComplex={requireComplexPassword}
          showErrors={touched || passwordByteLength(next) > 0}
          disabled={mutation.isPending}
          testIdPrefix={testIdPrefix}
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
